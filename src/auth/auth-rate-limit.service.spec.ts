import { Test, TestingModule } from '@nestjs/testing';
import { AuthRateLimitService } from './auth-rate-limit.service';
import { RedisService } from '../redis/redis.service';

describe('AuthRateLimitService', () => {
    let service: AuthRateLimitService;
    let redisService: jest.Mocked<RedisService>;

    const mockRedisService = {
        getJson: jest.fn(),
        setJson: jest.fn(),
        delete: jest.fn(),
        ttl: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthRateLimitService,
                {
                    provide: RedisService,
                    useValue: mockRedisService,
                },
            ],
        }).compile();

        service = module.get<AuthRateLimitService>(AuthRateLimitService);
        redisService = module.get(RedisService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getFailKey', () => {
        it('should generate correct fail key', () => {
            const login = 'testuser';
            const ip = '127.0.0.1';
            const key = (service as any).getFailKey(login, ip);
            expect(key).toBe(`auth:fail:${login}:${ip}`);
        });
    });

    describe('getLastTryKey', () => {
        it('should generate correct last try key', () => {
            const login = 'testuser';
            const ip = '127.0.0.1';
            const key = (service as any).getLastTryKey(login, ip);
            expect(key).toBe(`auth:fail:${login}:${ip}:last`);
        });
    });

    describe('getGlobalIpKey', () => {
        it('should generate correct global IP key', () => {
            const ip = '127.0.0.1';
            const key = (service as any).getGlobalIpKey(ip);
            expect(key).toBe(`auth:global:${ip}`);
        });
    });

    describe('calculateWaitTime', () => {
        it('should return 0 for attempts <= 3', () => {
            expect((service as any).calculateWaitTime(0)).toBe(0);
            expect((service as any).calculateWaitTime(1)).toBe(0);
            expect((service as any).calculateWaitTime(2)).toBe(0);
            expect((service as any).calculateWaitTime(3)).toBe(0);
        });

        it('should return 5 for attempts 4-5', () => {
            expect((service as any).calculateWaitTime(4)).toBe(5);
            expect((service as any).calculateWaitTime(5)).toBe(5);
        });

        it('should return 30 for attempts 6-7', () => {
            expect((service as any).calculateWaitTime(6)).toBe(30);
            expect((service as any).calculateWaitTime(7)).toBe(30);
        });

        it('should return 300 for attempts 8-9', () => {
            expect((service as any).calculateWaitTime(8)).toBe(300);
            expect((service as any).calculateWaitTime(9)).toBe(300);
        });

        it('should return 3600 for attempts >= 10', () => {
            expect((service as any).calculateWaitTime(10)).toBe(3600);
            expect((service as any).calculateWaitTime(15)).toBe(3600);
            expect((service as any).calculateWaitTime(100)).toBe(3600);
        });
    });

    describe('checkGlobalIpLimit', () => {
        const ip = '127.0.0.1';
        const key = `auth:global:${ip}`;

        it('should allow when count is less than 50', async () => {
            mockRedisService.getJson.mockResolvedValue(30);
            mockRedisService.ttl.mockResolvedValue(30);

            const result = await service.checkGlobalIpLimit(ip);

            expect(result).toEqual({ allowed: true });
            expect(redisService.getJson).toHaveBeenCalledWith(key);
            expect(redisService.ttl).not.toHaveBeenCalled();
        });

        it('should allow when count is null (no attempts)', async () => {
            mockRedisService.getJson.mockResolvedValue(null);

            const result = await service.checkGlobalIpLimit(ip);

            expect(result).toEqual({ allowed: true });
            expect(redisService.getJson).toHaveBeenCalledWith(key);
        });

        it('should block when count is 50 or more', async () => {
            mockRedisService.getJson.mockResolvedValue(50);
            mockRedisService.ttl.mockResolvedValue(120);

            const result = await service.checkGlobalIpLimit(ip);

            expect(result.allowed).toBe(false);
            expect(result.message).toContain('С вашего IP слишком много попыток');
            expect(result.message).toContain('2 минут');
            expect(redisService.ttl).toHaveBeenCalledWith(key);
        });

        it('should block and show correct minutes when ttl is 60 seconds', async () => {
            mockRedisService.getJson.mockResolvedValue(75);
            mockRedisService.ttl.mockResolvedValue(60);

            const result = await service.checkGlobalIpLimit(ip);

            expect(result.allowed).toBe(false);
            expect(result.message).toContain('1 минут');
        });

        it('should round up minutes correctly (ceil)', async () => {
            mockRedisService.getJson.mockResolvedValue(100);
            mockRedisService.ttl.mockResolvedValue(61);

            const result = await service.checkGlobalIpLimit(ip);

            expect(result.allowed).toBe(false);
            expect(result.message).toContain('2 минут');
        });
    });

    describe('recordGlobalIpAttempt', () => {
        const ip = '127.0.0.1';
        const key = `auth:global:${ip}`;

        it('should increment existing count', async () => {
            mockRedisService.getJson.mockResolvedValue(5);

            await service.recordGlobalIpAttempt(ip);

            expect(redisService.getJson).toHaveBeenCalledWith(key);
            expect(redisService.setJson).toHaveBeenCalledWith(key, '.', 6, 60);
        });

        it('should set count to 1 when no existing attempts', async () => {
            mockRedisService.getJson.mockResolvedValue(null);

            await service.recordGlobalIpAttempt(ip);

            expect(redisService.getJson).toHaveBeenCalledWith(key);
            expect(redisService.setJson).toHaveBeenCalledWith(key, '.', 1, 60);
        });

        it('should handle count 0 correctly', async () => {
            mockRedisService.getJson.mockResolvedValue(0);

            await service.recordGlobalIpAttempt(ip);

            expect(redisService.setJson).toHaveBeenCalledWith(key, '.', 1, 60);
        });
    });

    describe('checkAndRecordFailedAttempt', () => {
        const login = 'testuser';
        const ip = '127.0.0.1';
        const failKey = `auth:fail:${login}:${ip}`;
        const lastTryKey = `auth:fail:${login}:${ip}:last`;

        beforeEach(() => {
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should allow first attempt with 3 remaining attempts message', async () => {
            mockRedisService.getJson.mockResolvedValue(null);

            const result = await service.checkAndRecordFailedAttempt(login, ip);

            expect(result.allowed).toBe(true);
            expect(result.message).toBe('Неверный пароль. Осталось 3 попыток до задержки');
            expect(result.waitTime).toBeUndefined();
            expect(redisService.setJson).toHaveBeenCalledWith(failKey, '.', 1, 1800);
            expect(redisService.setJson).toHaveBeenCalledWith(lastTryKey, '.', expect.any(Number), 1800);
        });

        it('should allow second attempt with 2 remaining attempts message', async () => {
            mockRedisService.getJson
                .mockResolvedValueOnce(1)
                .mockResolvedValueOnce(0);

            const result = await service.checkAndRecordFailedAttempt(login, ip);

            expect(result.allowed).toBe(true);
            expect(result.message).toBe('Неверный пароль. Осталось 2 попыток до задержки');
            expect(redisService.setJson).toHaveBeenCalledWith(failKey, '.', 2, 1800);
        });

        it('should allow third attempt with 1 remaining attempts message', async () => {
            mockRedisService.getJson
                .mockResolvedValueOnce(2)
                .mockResolvedValueOnce(0);

            const result = await service.checkAndRecordFailedAttempt(login, ip);

            expect(result.allowed).toBe(true);
            expect(result.message).toBe('Неверный пароль. Осталось 1 попыток до задержки');
            expect(redisService.setJson).toHaveBeenCalledWith(failKey, '.', 3, 1800);
        });

        it('should allow 4th attempt (now 4 attempts) with wait time message', async () => {
            mockRedisService.getJson
                .mockResolvedValueOnce(3)
                .mockResolvedValueOnce(0);

            const result = await service.checkAndRecordFailedAttempt(login, ip);

            expect(result.allowed).toBe(true);
            expect(result.waitTime).toBe(5);
            expect(result.message).toBe('Неверный пароль. Следующая попытка будет доступна через 5 секунд');
            expect(redisService.setJson).toHaveBeenCalledWith(failKey, '.', 4, 1800);
        });

        it('should allow 5th attempt (now 5 attempts) with wait time message', async () => {
            mockRedisService.getJson
                .mockResolvedValueOnce(4)
                .mockResolvedValueOnce(0);

            const result = await service.checkAndRecordFailedAttempt(login, ip);

            expect(result.allowed).toBe(true);
            expect(result.waitTime).toBe(5);
            expect(result.message).toBe('Неверный пароль. Следующая попытка будет доступна через 5 секунд');
            expect(redisService.setJson).toHaveBeenCalledWith(failKey, '.', 5, 1800);
        });

        it('should allow 6th attempt (now 6 attempts) with 30s wait time message', async () => {
            mockRedisService.getJson
                .mockResolvedValueOnce(5)
                .mockResolvedValueOnce(0);

            const result = await service.checkAndRecordFailedAttempt(login, ip);

            expect(result.allowed).toBe(true);
            expect(result.waitTime).toBe(30);
            expect(result.message).toBe('Неверный пароль. Следующая попытка будет доступна через 30 секунд');
            expect(redisService.setJson).toHaveBeenCalledWith(failKey, '.', 6, 1800);
        });

        it('should block when wait time not elapsed', async () => {
            const now = Math.floor(Date.now() / 1000);
            mockRedisService.getJson
                .mockResolvedValueOnce(4)
                .mockResolvedValueOnce(now);

            const result = await service.checkAndRecordFailedAttempt(login, ip);

            expect(result.allowed).toBe(false);
            expect(result.waitTime).toBe(5);
            expect(result.message).toBe('Слишком много неудачных попыток. Подождите 5 секунд');
            expect(redisService.setJson).not.toHaveBeenCalled();
        });

        it('should allow when wait time has elapsed', async () => {
            const now = Math.floor(Date.now() / 1000);
            const lastTry = now - 10;
            mockRedisService.getJson
                .mockResolvedValueOnce(4)
                .mockResolvedValueOnce(lastTry);

            const result = await service.checkAndRecordFailedAttempt(login, ip);

            expect(result.allowed).toBe(true);
            expect(redisService.setJson).toHaveBeenCalled();
        });

        it('should handle lastTry = 0 (never tried before)', async () => {
            mockRedisService.getJson
                .mockResolvedValueOnce(4)
                .mockResolvedValueOnce(0);

            const result = await service.checkAndRecordFailedAttempt(login, ip);

            expect(result.allowed).toBe(true);
            expect(redisService.setJson).toHaveBeenCalled();
        });

        it('should handle case when attempts is null', async () => {
            mockRedisService.getJson
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(null);

            const result = await service.checkAndRecordFailedAttempt(login, ip);

            expect(result.allowed).toBe(true);
            expect(result.message).toBe('Неверный пароль. Осталось 3 попыток до задержки');
        });

        it('should show generic message when no remaining attempts left (already at max)', async () => {
            mockRedisService.getJson
                .mockResolvedValueOnce(4)
                .mockResolvedValueOnce(0);

            const result = await service.checkAndRecordFailedAttempt(login, ip);

            expect(result.allowed).toBe(true);
            expect(result.message).toBe('Неверный пароль. Следующая попытка будет доступна через 5 секунд');
        });
    });

    describe('clearFailedAttempts', () => {
        const login = 'testuser';
        const ip = '127.0.0.1';
        const failKey = `auth:fail:${login}:${ip}`;
        const lastTryKey = `auth:fail:${login}:${ip}:last`;

        it('should delete both fail and last try keys', async () => {
            mockRedisService.delete.mockResolvedValue(undefined);

            await service.clearFailedAttempts(login, ip);

            expect(redisService.delete).toHaveBeenCalledTimes(2);
            expect(redisService.delete).toHaveBeenCalledWith(failKey);
            expect(redisService.delete).toHaveBeenCalledWith(lastTryKey);
        });

        it('should handle delete errors gracefully', async () => {
            mockRedisService.delete.mockRejectedValue(new Error('Redis error'));

            await expect(service.clearFailedAttempts(login, ip)).rejects.toThrow('Redis error');
        });
    });

    describe('Integration scenario - sequential failed attempts', () => {
        const login = 'testuser';
        const ip = '127.0.0.1';

        beforeEach(() => {
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
            mockRedisService.setJson.mockResolvedValue(undefined);
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should handle full flow of failed attempts', async () => {
            mockRedisService.getJson.mockResolvedValue(null);
            let result = await service.checkAndRecordFailedAttempt(login, ip);
            expect(result.allowed).toBe(true);
            expect(result.message).toBe('Неверный пароль. Осталось 3 попыток до задержки');

            mockRedisService.getJson
                .mockResolvedValueOnce(1)
                .mockResolvedValueOnce(0);
            result = await service.checkAndRecordFailedAttempt(login, ip);
            expect(result.allowed).toBe(true);
            expect(result.message).toBe('Неверный пароль. Осталось 2 попыток до задержки');
            mockRedisService.getJson
                .mockResolvedValueOnce(2)
                .mockResolvedValueOnce(0);
            result = await service.checkAndRecordFailedAttempt(login, ip);
            expect(result.allowed).toBe(true);
            expect(result.message).toBe('Неверный пароль. Осталось 1 попыток до задержки');

            mockRedisService.getJson
                .mockResolvedValueOnce(3)
                .mockResolvedValueOnce(0);
            result = await service.checkAndRecordFailedAttempt(login, ip);
            expect(result.allowed).toBe(true);
            expect(result.waitTime).toBe(5);
            expect(result.message).toBe('Неверный пароль. Следующая попытка будет доступна через 5 секунд');

            const now = Math.floor(Date.now() / 1000);
            mockRedisService.getJson
                .mockResolvedValueOnce(4)
                .mockResolvedValueOnce(now);
            result = await service.checkAndRecordFailedAttempt(login, ip);
            expect(result.allowed).toBe(false);
            expect(result.message).toBe('Слишком много неудачных попыток. Подождите 5 секунд');

            jest.advanceTimersByTime(6000);
            const newNow = Math.floor(Date.now() / 1000);
            mockRedisService.getJson
                .mockResolvedValueOnce(4)
                .mockResolvedValueOnce(newNow - 6);
            result = await service.checkAndRecordFailedAttempt(login, ip);
            expect(result.allowed).toBe(true);
        });
    });

    describe('checkGlobalIpLimit integration', () => {
        const ip = '127.0.0.1';

        it('should block after 50 attempts', async () => {
            for (let i = 0; i < 49; i++) {
                mockRedisService.getJson.mockResolvedValue(i);
                let result = await service.checkGlobalIpLimit(ip);
                expect(result.allowed).toBe(true);
            }

            mockRedisService.getJson.mockResolvedValue(49);
            let result = await service.checkGlobalIpLimit(ip);
            expect(result.allowed).toBe(true);

            mockRedisService.getJson.mockResolvedValue(50);
            mockRedisService.ttl.mockResolvedValue(30);
            result = await service.checkGlobalIpLimit(ip);
            expect(result.allowed).toBe(false);
        });
    });
});