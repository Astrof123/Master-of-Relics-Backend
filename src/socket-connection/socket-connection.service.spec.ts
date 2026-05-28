import { Test, TestingModule } from '@nestjs/testing';
import { SocketConnectionService } from './socket-connection.service';
import { RedisService } from '../redis/redis.service';

describe('SocketConnectionService', () => {
    let service: SocketConnectionService;
    let redisService: jest.Mocked<RedisService>;

    const mockRedisService = {
        addToSet: jest.fn(),
        removeFromSet: jest.fn(),
        getSetMembers: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SocketConnectionService,
                {
                    provide: RedisService,
                    useValue: mockRedisService,
                },
            ],
        }).compile();

        service = module.get<SocketConnectionService>(SocketConnectionService);
        redisService = module.get(RedisService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('setPlayerOnline', () => {
        const userId = 'user-123';

        it('should add user to online set with TTL', async () => {
            mockRedisService.addToSet.mockResolvedValue(undefined);

            await service.setPlayerOnline(userId);

            expect(redisService.addToSet).toHaveBeenCalledWith(
                'online:index',
                userId,
                60 * 60 * 24,
            );
        });

        it('should handle userId as number', async () => {
            const numericUserId = 456;
            mockRedisService.addToSet.mockResolvedValue(undefined);

            await service.setPlayerOnline(numericUserId.toString());

            expect(redisService.addToSet).toHaveBeenCalledWith(
                'online:index',
                '456',
                expect.any(Number),
            );
        });

        it('should handle redis errors', async () => {
            const error = new Error('Redis connection failed');
            mockRedisService.addToSet.mockRejectedValue(error);

            await expect(service.setPlayerOnline(userId)).rejects.toThrow(
                error,
            );
        });
    });

    describe('setPlayerOffline', () => {
        const userId = 'user-123';

        it('should remove user from online set', async () => {
            mockRedisService.removeFromSet.mockResolvedValue(undefined);

            await service.setPlayerOffline(userId);

            expect(redisService.removeFromSet).toHaveBeenCalledWith(
                'online:index',
                userId,
            );
        });

        it('should handle userId as number', async () => {
            const numericUserId = 456;
            mockRedisService.removeFromSet.mockResolvedValue(undefined);

            await service.setPlayerOffline(numericUserId.toString());

            expect(redisService.removeFromSet).toHaveBeenCalledWith(
                'online:index',
                '456',
            );
        });

        it('should handle redis errors', async () => {
            const error = new Error('Redis connection failed');
            mockRedisService.removeFromSet.mockRejectedValue(error);

            await expect(service.setPlayerOffline(userId)).rejects.toThrow(
                error,
            );
        });
    });

    describe('getOnlinePlayers', () => {
        it('should return list of online players', async () => {
            const mockPlayers = ['user-1', 'user-2', 'user-3'];
            mockRedisService.getSetMembers.mockResolvedValue(mockPlayers);

            const result = await service.getOnlinePlayers();

            expect(redisService.getSetMembers).toHaveBeenCalledWith(
                'online:index',
            );
            expect(result).toEqual(mockPlayers);
        });

        it('should return empty array when no players online', async () => {
            mockRedisService.getSetMembers.mockResolvedValue([]);

            const result = await service.getOnlinePlayers();

            expect(result).toEqual([]);
        });

        it('should handle redis errors', async () => {
            const error = new Error('Redis connection failed');
            mockRedisService.getSetMembers.mockRejectedValue(error);

            await expect(service.getOnlinePlayers()).rejects.toThrow(error);
        });
    });

    describe('Integration scenarios', () => {
        it('should correctly track player online/offline sequence', async () => {
            const userId = 'user-123';
            mockRedisService.addToSet.mockResolvedValue(undefined);
            mockRedisService.removeFromSet.mockResolvedValue(undefined);
            mockRedisService.getSetMembers
                .mockResolvedValueOnce(['user-123'])
                .mockResolvedValueOnce([]);

            await service.setPlayerOnline(userId);
            expect(redisService.addToSet).toHaveBeenCalledWith(
                'online:index',
                userId,
                expect.any(Number),
            );

            let onlinePlayers = await service.getOnlinePlayers();
            expect(onlinePlayers).toEqual(['user-123']);

            await service.setPlayerOffline(userId);
            expect(redisService.removeFromSet).toHaveBeenCalledWith(
                'online:index',
                userId,
            );

            onlinePlayers = await service.getOnlinePlayers();
            expect(onlinePlayers).toEqual([]);
        });

        it('should handle multiple players online/offline', async () => {
            const user1 = 'user-1';
            const user2 = 'user-2';
            const user3 = 'user-3';

            mockRedisService.addToSet.mockResolvedValue(undefined);
            mockRedisService.removeFromSet.mockResolvedValue(undefined);

            mockRedisService.getSetMembers
                .mockResolvedValueOnce([user1])
                .mockResolvedValueOnce([user1, user2])
                .mockResolvedValueOnce([user1, user2, user3])
                .mockResolvedValueOnce([user2, user3])
                .mockResolvedValueOnce([user3])
                .mockResolvedValueOnce([]);

            await service.setPlayerOnline(user1);
            expect(await service.getOnlinePlayers()).toEqual([user1]);

            await service.setPlayerOnline(user2);
            expect(await service.getOnlinePlayers()).toEqual([user1, user2]);

            await service.setPlayerOnline(user3);
            expect(await service.getOnlinePlayers()).toEqual([
                user1,
                user2,
                user3,
            ]);

            await service.setPlayerOffline(user1);
            expect(await service.getOnlinePlayers()).toEqual([user2, user3]);

            await service.setPlayerOffline(user2);
            expect(await service.getOnlinePlayers()).toEqual([user3]);

            await service.setPlayerOffline(user3);
            expect(await service.getOnlinePlayers()).toEqual([]);
        });
    });

    describe('Edge cases', () => {
        it('should handle empty userId', async () => {
            const emptyUserId = '';
            mockRedisService.addToSet.mockResolvedValue(undefined);

            await service.setPlayerOnline(emptyUserId);

            expect(redisService.addToSet).toHaveBeenCalledWith(
                'online:index',
                '',
                expect.any(Number),
            );
        });

        it('should handle very long userId', async () => {
            const longUserId = 'a'.repeat(1000);
            mockRedisService.addToSet.mockResolvedValue(undefined);

            await service.setPlayerOnline(longUserId);

            expect(redisService.addToSet).toHaveBeenCalledWith(
                'online:index',
                longUserId,
                expect.any(Number),
            );
        });

        it('should handle special characters in userId', async () => {
            const specialUserId = 'user@#$%^&*()';
            mockRedisService.addToSet.mockResolvedValue(undefined);

            await service.setPlayerOnline(specialUserId);

            expect(redisService.addToSet).toHaveBeenCalledWith(
                'online:index',
                specialUserId,
                expect.any(Number),
            );
        });
    });

    describe('TTL verification', () => {
        it('should use correct TTL value (24 hours)', () => {
            const ttl = (service as any).CONNECT_TTL;
            expect(ttl).toBe(60 * 60 * 24);
        });

        it('should pass TTL to redis service on setPlayerOnline', async () => {
            const userId = 'user-123';
            mockRedisService.addToSet.mockResolvedValue(undefined);

            await service.setPlayerOnline(userId);

            expect(redisService.addToSet).toHaveBeenCalledWith(
                'online:index',
                userId,
                60 * 60 * 24,
            );
        });
    });
});
