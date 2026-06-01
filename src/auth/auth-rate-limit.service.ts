import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class AuthRateLimitService {
    constructor(private readonly redisService: RedisService) {}

    private getFailKey(login: string, ip: string): string {
        return `auth:fail:${login}:${ip}`;
    }

    private getLastTryKey(login: string, ip: string): string {
        return `auth:fail:${login}:${ip}:last`;
    }

    private getGlobalIpKey(ip: string): string {
        return `auth:global:${ip}`;
    }

    private calculateWaitTime(attempts: number): number {
        if (attempts <= 3) return 0;
        if (attempts <= 5) return 5; 
        if (attempts <= 7) return 30;
        if (attempts <= 9) return 300;
        return 3600;
    }

    async checkGlobalIpLimit(ip: string): Promise<{ allowed: boolean; message?: string }> {
        const key = this.getGlobalIpKey(ip);
        const countStr = await this.redisService.getJson<number>(key);
        const count = countStr || 0;

        if (count >= 50) {
            const ttl = await this.redisService.ttl(key);
            return {
                allowed: false,
                message: `С вашего IP слишком много попыток. Подождите ${Math.ceil(ttl / 60)} минут(ы)`,
            };
        }

        return { allowed: true };
    }

    async recordGlobalIpAttempt(ip: string): Promise<void> {
        const key = this.getGlobalIpKey(ip);
        const countStr = await this.redisService.getJson<number>(key);
        const count = (countStr || 0) + 1;
        await this.redisService.setJson(key, '.', count, 60);
    }

    async checkAndRecordFailedAttempt(
        login: string,
        ip: string,
    ): Promise<{ allowed: boolean; waitTime?: number; message?: string }> {
        const failKey = this.getFailKey(login, ip);
        const lastTryKey = this.getLastTryKey(login, ip);

        const attempts = (await this.redisService.getJson<number>(failKey)) || 0;
        const lastTry = (await this.redisService.getJson<number>(lastTryKey)) || 0;
        const now = Math.floor(Date.now() / 1000);

        const waitTime = this.calculateWaitTime(attempts);

        if (waitTime > 0 && lastTry > 0) {
            const elapsed = now - lastTry;
            if (elapsed < waitTime) {
                const remaining = waitTime - elapsed;
                return {
                    allowed: false,
                    waitTime: remaining,
                    message: `Слишком много неудачных попыток. Подождите ${remaining} секунд`,
                };
            }
        }

        const newAttempts = attempts + 1;
        await this.redisService.setJson(failKey, '.', newAttempts, 1800);
        await this.redisService.setJson(lastTryKey, '.', now, 1800);

        const newWaitTime = this.calculateWaitTime(newAttempts);
        
        if (newWaitTime > 0) {
            return {
                allowed: true,
                waitTime: newWaitTime,
                message: `Неверный пароль. Следующая попытка будет доступна через ${newWaitTime} секунд`,
            };
        }

        const remainingAttempts = 4 - newAttempts;
        return {
            allowed: true,
            message: remainingAttempts > 0
                ? `Неверный пароль. Осталось ${remainingAttempts} попыток до задержки`
                : 'Неверный пароль',
        };
    }

    async clearFailedAttempts(login: string, ip: string): Promise<void> {
        const failKey = this.getFailKey(login, ip);
        const lastTryKey = this.getLastTryKey(login, ip);
        
        await this.redisService.delete(failKey);
        await this.redisService.delete(lastTryKey);
    }
}