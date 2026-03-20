import { Inject, Injectable } from '@nestjs/common';
import Redis, { ChainableCommander } from 'ioredis';

@Injectable()
export class RedisService {
    constructor(@Inject('REDIS_CLIENT') private readonly redisClient: Redis) {}

    onModuleDestroy() {
        this.redisClient.disconnect();
    }

    async setJson<T>(
        key: string,
        path: string = ".",
        value: T,
        ttl?: number
    ): Promise<void> {
        const valueStr = JSON.stringify(value);
        
        await this.redisClient.call('JSON.SET', key, path, valueStr);

        if (ttl) {
            await this.redisClient.expire(key, ttl);
        }
    }

    async getJson<T>(key: string, path: string = '.'): Promise<T | null> {
        try {
            const result = await this.redisClient.call('JSON.GET', key, path);
            
            if (!result) {
                return null;
            }

            return JSON.parse(result as string) as T;
        } catch (error) {
            return null;
        }
    }

    multi(): ChainableCommander {
        return this.redisClient.multi();
    }

    async execMulti(multi: ChainableCommander): Promise<any[] | null> {
        return await multi.exec();
    }

    async watch(...keys: string[]): Promise<void> {
        await this.redisClient.watch(...keys);
    }

    async unwatch(): Promise<void> {
        await this.redisClient.unwatch();
    }

    jsonSetInTransaction(
        multi: ChainableCommander,
        key: string,
        path: string,
        value: any
    ): ChainableCommander {
        return multi.call('JSON.SET', key, path, JSON.stringify(value));
    }

    jsonGetInTransaction(
        multi: ChainableCommander,
        key: string,
        path: string
    ): ChainableCommander {
        return multi.call('JSON.GET', key, path);
    }

    async arrayAppend(key: string, path: string, ...values: any[]): Promise<number> {
        const stringValues = values.map(v => JSON.stringify(v));
        const result = await this.redisClient.call(
            'JSON.ARRAPPEND',
            key,
            path,
            ...stringValues,
        );

        return parseInt(result as string, 10);
    }

    async arrayPop<T>(key: string, path: string, index: number = -1): Promise<T | null> {
        const result = await this.redisClient.call('JSON.ARRPOP', key, path, index);
        
        if (!result) {
            return null
        };

        return JSON.parse(result as string) as T;
    }

    async arrayLength(key: string, path: string): Promise<number> {
        const result = await this.redisClient.call('JSON.ARRLEN', key, path);
        return parseInt(result as string, 10);
    }

    async delete(key: string, path?: string): Promise<void> {
        if (path) {
            await this.redisClient.call('JSON.DEL', key, path);
        } else {
            await this.redisClient.del(key);
        }
    }

    async expire(key: string, seconds: number): Promise<void> {
        await this.redisClient.expire(key, seconds);
    }

    async ttl(key: string): Promise<number> {
        return await this.redisClient.ttl(key);
    }

    async exists(key: string): Promise<boolean> {
        const result = await this.redisClient.exists(key);
        return result === 1;
    }

    async addToSet(key: string, member: string): Promise<void> {
        await this.redisClient.sadd(key, member);
    }

    async addToSortedSet(key: string, score: number, member: string): Promise<void> {
        await this.redisClient.zadd(key, score, member);
    }

    async getSetMembers(key: string): Promise<string[]> {
        return await this.redisClient.smembers(key);
    }

    async getSortedSetRange(key: string, start: number, stop: number): Promise<string[]> {
        return await this.redisClient.zrange(key, start, stop);
    }

    async removeFromSet(key: string, member: string): Promise<void> {
        await this.redisClient.srem(key, member);
    }

    async removeFromSortedSet(key: string, member: string): Promise<void> {
        await this.redisClient.zrem(key, member);
    }
}