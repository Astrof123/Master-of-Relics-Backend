import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersStatsService } from './users-stats.service';
import { UserStats } from './entities/user-stats.entity';
import { UserStatsNotFoundException } from './exceptions/users.exception';

const createMockUserStats = (userId: string, wins: number = 0, winSeries: number = 0, totalGames: number = 0): UserStats => {
    const stats = new UserStats();
    stats.id = 1;
    stats.userId = userId;
    stats.wins = wins;
    stats.winSeries = winSeries;
    stats.totalGames = totalGames;
    stats.user = null as any;
    return stats;
};

describe('UsersStatsService', () => {
    let service: UsersStatsService;
    let userStatsRepository: jest.Mocked<Repository<UserStats>>;

    const mockUserStatsRepository = {
        findOne: jest.fn(),
        save: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersStatsService,
                {
                    provide: getRepositoryToken(UserStats),
                    useValue: mockUserStatsRepository,
                },
            ],
        }).compile();

        service = module.get<UsersStatsService>(UsersStatsService);
        userStatsRepository = module.get(getRepositoryToken(UserStats));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('setWin', () => {
        it('should increment wins, winSeries and totalGames by 1', async () => {
            const userId = 'user-1';
            const initialStats = createMockUserStats(userId, 5, 3, 10);
            const expectedStats = createMockUserStats(userId, 6, 4, 11);

            mockUserStatsRepository.findOne.mockResolvedValue(initialStats);
            mockUserStatsRepository.save.mockResolvedValue(expectedStats);

            await service.setWin(userId);

            expect(mockUserStatsRepository.findOne).toHaveBeenCalledWith({
                where: { userId }
            });
            expect(initialStats.wins).toBe(6);
            expect(initialStats.winSeries).toBe(4);
            expect(initialStats.totalGames).toBe(11);
            expect(mockUserStatsRepository.save).toHaveBeenCalledWith(initialStats);
        });

        it('should increment stats correctly when starting from zero', async () => {
            const userId = 'user-2';
            const initialStats = createMockUserStats(userId, 0, 0, 0);
            
            mockUserStatsRepository.findOne.mockResolvedValue(initialStats);
            mockUserStatsRepository.save.mockResolvedValue(initialStats);

            await service.setWin(userId);

            expect(initialStats.wins).toBe(1);
            expect(initialStats.winSeries).toBe(1);
            expect(initialStats.totalGames).toBe(1);
        });

        it('should increment stats correctly when winSeries is high', async () => {
            const userId = 'user-3';
            const initialStats = createMockUserStats(userId, 10, 10, 20);
            
            mockUserStatsRepository.findOne.mockResolvedValue(initialStats);
            mockUserStatsRepository.save.mockResolvedValue(initialStats);

            await service.setWin(userId);

            expect(initialStats.wins).toBe(11);
            expect(initialStats.winSeries).toBe(11);
            expect(initialStats.totalGames).toBe(21);
        });

        it('should throw UserStatsNotFoundException if user stats not found', async () => {
            const userId = 'non-existent';

            mockUserStatsRepository.findOne.mockResolvedValue(null);

            await expect(service.setWin(userId)).rejects.toThrow(UserStatsNotFoundException);
            expect(mockUserStatsRepository.findOne).toHaveBeenCalledWith({
                where: { userId }
            });
            expect(mockUserStatsRepository.save).not.toHaveBeenCalled();
        });

        it('should handle database error when saving', async () => {
            const userId = 'user-1';
            const initialStats = createMockUserStats(userId, 5, 3, 10);
            const dbError = new Error('Database connection error');

            mockUserStatsRepository.findOne.mockResolvedValue(initialStats);
            mockUserStatsRepository.save.mockRejectedValue(dbError);

            await expect(service.setWin(userId)).rejects.toThrow('Database connection error');
            expect(mockUserStatsRepository.findOne).toHaveBeenCalled();
            expect(mockUserStatsRepository.save).toHaveBeenCalled();
        });
    });

    describe('setLose', () => {
        it('should reset winSeries to 0 and increment totalGames by 1', async () => {
            const userId = 'user-1';
            const initialStats = createMockUserStats(userId, 5, 3, 10);
            const expectedStats = createMockUserStats(userId, 5, 0, 11);

            mockUserStatsRepository.findOne.mockResolvedValue(initialStats);
            mockUserStatsRepository.save.mockResolvedValue(expectedStats);

            await service.setLose(userId);

            expect(mockUserStatsRepository.findOne).toHaveBeenCalledWith({
                where: { userId }
            });
            expect(initialStats.winSeries).toBe(0);
            expect(initialStats.totalGames).toBe(11);
            expect(initialStats.wins).toBe(5);
            expect(mockUserStatsRepository.save).toHaveBeenCalledWith(initialStats);
        });

        it('should reset winSeries from positive number to 0', async () => {
            const userId = 'user-2';
            const initialStats = createMockUserStats(userId, 10, 15, 25);
            
            mockUserStatsRepository.findOne.mockResolvedValue(initialStats);
            mockUserStatsRepository.save.mockResolvedValue(initialStats);

            await service.setLose(userId);

            expect(initialStats.winSeries).toBe(0);
            expect(initialStats.totalGames).toBe(26);
            expect(initialStats.wins).toBe(10);
        });

        it('should handle winSeries already being 0', async () => {
            const userId = 'user-3';
            const initialStats = createMockUserStats(userId, 3, 0, 8);
            
            mockUserStatsRepository.findOne.mockResolvedValue(initialStats);
            mockUserStatsRepository.save.mockResolvedValue(initialStats);

            await service.setLose(userId);

            expect(initialStats.winSeries).toBe(0);
            expect(initialStats.totalGames).toBe(9);
            expect(initialStats.wins).toBe(3);
        });

        it('should handle first game loss', async () => {
            const userId = 'user-4';
            const initialStats = createMockUserStats(userId, 0, 0, 0);
            
            mockUserStatsRepository.findOne.mockResolvedValue(initialStats);
            mockUserStatsRepository.save.mockResolvedValue(initialStats);

            await service.setLose(userId);

            expect(initialStats.winSeries).toBe(0);
            expect(initialStats.totalGames).toBe(1);
            expect(initialStats.wins).toBe(0);
        });

        it('should throw UserStatsNotFoundException if user stats not found', async () => {
            const userId = 'non-existent';

            mockUserStatsRepository.findOne.mockResolvedValue(null);

            await expect(service.setLose(userId)).rejects.toThrow(UserStatsNotFoundException);
            expect(mockUserStatsRepository.findOne).toHaveBeenCalledWith({
                where: { userId }
            });
            expect(mockUserStatsRepository.save).not.toHaveBeenCalled();
        });

        it('should handle database error when saving', async () => {
            const userId = 'user-1';
            const initialStats = createMockUserStats(userId, 5, 3, 10);
            const dbError = new Error('Database connection error');

            mockUserStatsRepository.findOne.mockResolvedValue(initialStats);
            mockUserStatsRepository.save.mockRejectedValue(dbError);

            await expect(service.setLose(userId)).rejects.toThrow('Database connection error');
            expect(mockUserStatsRepository.findOne).toHaveBeenCalled();
            expect(mockUserStatsRepository.save).toHaveBeenCalled();
        });
    });

    describe('Edge cases and combinations', () => {
        it('should handle multiple wins in a row correctly', async () => {
            const userId = 'user-1';
            const initialStats = createMockUserStats(userId, 0, 0, 0);
            
            mockUserStatsRepository.findOne.mockResolvedValue(initialStats);
            mockUserStatsRepository.save.mockResolvedValue(initialStats);

            await service.setWin(userId);
            expect(initialStats.wins).toBe(1);
            expect(initialStats.winSeries).toBe(1);
            expect(initialStats.totalGames).toBe(1);

            await service.setWin(userId);
            expect(initialStats.wins).toBe(2);
            expect(initialStats.winSeries).toBe(2);
            expect(initialStats.totalGames).toBe(2);

            await service.setWin(userId);
            expect(initialStats.wins).toBe(3);
            expect(initialStats.winSeries).toBe(3);
            expect(initialStats.totalGames).toBe(3);
        });

        it('should handle win after loss correctly', async () => {
            const userId = 'user-1';
            const initialStats = createMockUserStats(userId, 0, 0, 0);
            
            mockUserStatsRepository.findOne.mockResolvedValue(initialStats);
            mockUserStatsRepository.save.mockResolvedValue(initialStats);

            await service.setLose(userId);
            expect(initialStats.winSeries).toBe(0);
            expect(initialStats.totalGames).toBe(1);
            expect(initialStats.wins).toBe(0);

            await service.setWin(userId);
            expect(initialStats.wins).toBe(1);
            expect(initialStats.winSeries).toBe(1);
            expect(initialStats.totalGames).toBe(2);
        });

        it('should handle loss after win streak correctly', async () => {
            const userId = 'user-1';
            const initialStats = createMockUserStats(userId, 0, 0, 0);
            
            mockUserStatsRepository.findOne.mockResolvedValue(initialStats);
            mockUserStatsRepository.save.mockResolvedValue(initialStats);

            await service.setWin(userId);
            await service.setWin(userId);
            await service.setWin(userId);
            expect(initialStats.wins).toBe(3);
            expect(initialStats.winSeries).toBe(3);
            expect(initialStats.totalGames).toBe(3);

            await service.setLose(userId);
            expect(initialStats.winSeries).toBe(0);
            expect(initialStats.totalGames).toBe(4);
            expect(initialStats.wins).toBe(3);
        });

        it('should handle multiple operations on same user', async () => {
            const userId = 'user-1';
            const initialStats = createMockUserStats(userId, 0, 0, 0);
            
            mockUserStatsRepository.findOne.mockResolvedValue(initialStats);
            mockUserStatsRepository.save.mockResolvedValue(initialStats);

            await service.setWin(userId);
            await service.setWin(userId);
            await service.setLose(userId);
            await service.setWin(userId);
            await service.setLose(userId);
            await service.setLose(userId);

            expect(initialStats.wins).toBe(3);
            expect(initialStats.winSeries).toBe(0);
            expect(initialStats.totalGames).toBe(6);
        });
    });

    describe('Repository interaction verification', () => {
        it('should call findOne with correct parameters for setWin', async () => {
            const userId = 'user-1';
            const stats = createMockUserStats(userId, 0, 0, 0);
            
            mockUserStatsRepository.findOne.mockResolvedValue(stats);
            mockUserStatsRepository.save.mockResolvedValue(stats);

            await service.setWin(userId);

            expect(mockUserStatsRepository.findOne).toHaveBeenCalledTimes(1);
            expect(mockUserStatsRepository.findOne).toHaveBeenCalledWith({
                where: { userId }
            });
        });

        it('should call findOne with correct parameters for setLose', async () => {
            const userId = 'user-1';
            const stats = createMockUserStats(userId, 0, 0, 0);
            
            mockUserStatsRepository.findOne.mockResolvedValue(stats);
            mockUserStatsRepository.save.mockResolvedValue(stats);

            await service.setLose(userId);

            expect(mockUserStatsRepository.findOne).toHaveBeenCalledTimes(1);
            expect(mockUserStatsRepository.findOne).toHaveBeenCalledWith({
                where: { userId }
            });
        });

        it('should call save exactly once for setWin', async () => {
            const userId = 'user-1';
            const stats = createMockUserStats(userId, 0, 0, 0);
            
            mockUserStatsRepository.findOne.mockResolvedValue(stats);
            mockUserStatsRepository.save.mockResolvedValue(stats);

            await service.setWin(userId);

            expect(mockUserStatsRepository.save).toHaveBeenCalledTimes(1);
        });

        it('should call save exactly once for setLose', async () => {
            const userId = 'user-1';
            const stats = createMockUserStats(userId, 0, 0, 0);
            
            mockUserStatsRepository.findOne.mockResolvedValue(stats);
            mockUserStatsRepository.save.mockResolvedValue(stats);

            await service.setLose(userId);

            expect(mockUserStatsRepository.save).toHaveBeenCalledTimes(1);
        });
    });
});