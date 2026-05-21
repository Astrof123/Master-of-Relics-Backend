import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserStats } from './entities/user-stats.entity';
import { FriendRelationShip } from './entities/friend-relationship.entity';
import { Report } from './entities/report.entity';
import { SocketConnectionService } from '../socket-connection/socket-connection.service';
import {
    UserNotFoundException,
    UserStatsNotFoundException,
    FriendshipNotFoundException,
    InvalidFriendException,
} from './exceptions/users.exception';
import { RELATIONSHIP } from './types/friend';
import { FindFriendsDto } from './dto/find-friends.dto';
import { ReportUserDto } from './dto/report-user.dto';
import { BanUserDto } from './dto/ban-user.dto';
import { UnbanUserDto } from './dto/unban-user.dto';
import { SetAdminDto } from './dto/set-admin.dto';
import { GetUsersDto } from './dto/users.dto';
import { GetReportsDto } from './dto/get-reports.dto';
import { validate as isValidUUID } from 'uuid';

jest.mock('uuid');

describe('UsersService', () => {
    let service: UsersService;
    let userRepository: Repository<User>;
    let userStatsRepository: Repository<UserStats>;
    let friendRelationShipRepository: Repository<FriendRelationShip>;
    let reportRepository: Repository<Report>;
    let socketConnectionService: SocketConnectionService;

    const mockUserRepository = {
        findOne: jest.fn(),
        find: jest.fn(),
        save: jest.fn(),
        createQueryBuilder: jest.fn(),
    };

    const mockUserStatsRepository = {
        findOne: jest.fn(),
    };

    const mockFriendRelationShipRepository = {
        findOne: jest.fn(),
        find: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        softDelete: jest.fn(),
    };

    const mockReportRepository = {
        findOne: jest.fn(),
        find: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        createQueryBuilder: jest.fn(),
    };

    const mockSocketConnectionService = {
        getOnlinePlayers: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                {
                    provide: getRepositoryToken(User),
                    useValue: mockUserRepository,
                },
                {
                    provide: getRepositoryToken(UserStats),
                    useValue: mockUserStatsRepository,
                },
                {
                    provide: getRepositoryToken(FriendRelationShip),
                    useValue: mockFriendRelationShipRepository,
                },
                {
                    provide: getRepositoryToken(Report),
                    useValue: mockReportRepository,
                },
                {
                    provide: SocketConnectionService,
                    useValue: mockSocketConnectionService,
                },
            ],
        }).compile();

        service = module.get<UsersService>(UsersService);
        userRepository = module.get<Repository<User>>(getRepositoryToken(User));
        userStatsRepository = module.get<Repository<UserStats>>(getRepositoryToken(UserStats));
        friendRelationShipRepository = module.get<Repository<FriendRelationShip>>(
            getRepositoryToken(FriendRelationShip),
        );
        reportRepository = module.get<Repository<Report>>(getRepositoryToken(Report));
        socketConnectionService = module.get<SocketConnectionService>(SocketConnectionService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findFriends', () => {
        it('should return filtered users without existing friendships', async () => {
            const findFriendsDto: FindFriendsDto = { searchQuery: 'FRIEND123' };
            const currentUserId = 'user-1';
            const users = [
                { id: 'user-2', nickname: 'Friend1', friendCode: 'FRIEND123' },
                { id: 'user-3', nickname: 'Friend2', friendCode: 'FRIEND123' },
            ];

            mockUserRepository.find.mockResolvedValue(users);
            mockFriendRelationShipRepository.findOne.mockResolvedValue(null);

            const result = await service.findFriends(findFriendsDto, currentUserId);

            expect(mockUserRepository.find).toHaveBeenCalledWith({
                where: { id: Not(currentUserId), friendCode: findFriendsDto.searchQuery },
                take: 12,
            });
            expect(result).toEqual(users);
            expect(mockFriendRelationShipRepository.findOne).toHaveBeenCalledTimes(2);
        });

        it('should exclude users that already have friendship', async () => {
            const findFriendsDto: FindFriendsDto = { searchQuery: 'FRIEND123' };
            const currentUserId = 'user-1';
            const users = [
                { id: 'user-2', nickname: 'Friend1', friendCode: 'FRIEND123' },
                { id: 'user-3', nickname: 'Friend2', friendCode: 'FRIEND123' },
            ];

            mockUserRepository.find.mockResolvedValue(users);
            mockFriendRelationShipRepository.findOne
                .mockResolvedValueOnce({ id: 'friendship-1' })
                .mockResolvedValueOnce(null);

            const result = await service.findFriends(findFriendsDto, currentUserId);

            expect(result).toEqual([users[1]]);
        });
    });

    describe('findOne', () => {
        it('should return user if found', async () => {
            const userId = 'user-1';
            const user = { id: userId, nickname: 'TestUser', bannedUntil: null };

            mockUserRepository.findOne.mockResolvedValue(user);

            const result = await service.findOne(userId);

            expect(result).toEqual(user);
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
                where: { id: userId },
            });
        });

        it('should throw UserNotFoundException if user not found', async () => {
            const userId = 'non-existent';

            mockUserRepository.findOne.mockResolvedValue(null);

            await expect(service.findOne(userId)).rejects.toThrow(UserNotFoundException);
        });

        it('should clear expired ban', async () => {
            const userId = 'user-1';
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 5);
            const user = {
                id: userId,
                nickname: 'BannedUser',
                bannedUntil: pastDate,
                banReason: 'Spam',
            };

            mockUserRepository.findOne.mockResolvedValue(user);
            mockUserRepository.save.mockResolvedValue({ ...user, bannedUntil: null, banReason: null });

            const result = await service.findOne(userId);

            expect(result.bannedUntil).toBeNull();
            expect(result.banReason).toBeNull();
            expect(mockUserRepository.save).toHaveBeenCalled();
        });

        it('should keep active ban', async () => {
            const userId = 'user-1';
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 5);
            const user = {
                id: userId,
                nickname: 'BannedUser',
                bannedUntil: futureDate,
                banReason: 'Spam',
            };

            mockUserRepository.findOne.mockResolvedValue(user);

            const result = await service.findOne(userId);

            expect(result.bannedUntil).toEqual(futureDate);
            expect(mockUserRepository.save).not.toHaveBeenCalled();
        });
    });

    describe('getFriends', () => {
        it('should return friends with online status', async () => {
            const userId = 'user-1';
            const user = { id: userId, nickname: 'CurrentUser' };
            const friendships = [
                {
                    id: 'friendship-1',
                    requesterId: userId,
                    addresseeId: 'user-2',
                    status: RELATIONSHIP.FRIEND,
                    requester: { id: userId, nickname: 'CurrentUser' },
                    addressee: { id: 'user-2', nickname: 'Friend1' },
                },
                {
                    id: 'friendship-2',
                    requesterId: 'user-3',
                    addresseeId: userId,
                    status: RELATIONSHIP.FRIEND,
                    requester: { id: 'user-3', nickname: 'Friend2' },
                    addressee: { id: userId, nickname: 'CurrentUser' },
                },
            ];

            mockUserRepository.findOne.mockResolvedValue(user);
            mockFriendRelationShipRepository.find.mockResolvedValue(friendships);
            mockSocketConnectionService.getOnlinePlayers.mockResolvedValue(['user-2']);

            const result = await service.getFriends(userId);

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                id: 'friendship-1',
                nickname: 'Friend1',
                friendId: 'user-2',
                isOnline: true,
            });
            expect(result[1]).toEqual({
                id: 'friendship-2',
                nickname: 'Friend2',
                friendId: 'user-3',
                isOnline: false,
            });
        });

        it('should throw UserNotFoundException if user not found', async () => {
            const userId = 'non-existent';

            mockUserRepository.findOne.mockResolvedValue(null);

            await expect(service.getFriends(userId)).rejects.toThrow(UserNotFoundException);
        });
    });

    describe('profile', () => {
        beforeEach(() => {
            (isValidUUID as jest.Mock).mockReturnValue(true);
        });

        it('should return user profile for other user', async () => {
            const profileId = 'user-2';
            const currentUserId = 'user-1';
            const user = { id: profileId, nickname: 'ProfileUser', bannedUntil: null };
            const userStats = { wins: 10, winSeries: 3, totalGames: 15 };
            const currentUser = { id: currentUserId, nickname: 'CurrentUser' };
            const mockFriends = [
                { id: 'friend-1', nickname: 'Friend1', friendId: 'friend-1-id', isOnline: false }
            ];

            mockUserRepository.findOne
                .mockResolvedValueOnce(user)
                .mockResolvedValueOnce(currentUser);
            
            mockUserStatsRepository.findOne.mockResolvedValue(userStats);
            
            jest.spyOn(service, 'getFriends').mockResolvedValue(mockFriends as any);
            
            mockFriendRelationShipRepository.findOne.mockResolvedValue(null);
            mockReportRepository.findOne.mockResolvedValue(null);
            mockSocketConnectionService.getOnlinePlayers.mockResolvedValue([]);

            const result = await service.profile(profileId, currentUserId);

            expect(result).toEqual({
                id: profileId,
                nickname: 'ProfileUser',
                isOnline: false,
                friends: mockFriends,
                isReported: false,
                relationship: RELATIONSHIP.STRANGER,
                relationshipInitiator: null,
                stats: {
                    wins: 10,
                    winSeries: 3,
                    totalGames: 15,
                },
                offersFriendship: null,
                isBanned: false,
            });
            
            jest.restoreAllMocks();
        });

        it('should return profile with friendship offers for current user', async () => {
            const profileId = 'user-1';
            const currentUserId = 'user-1';
            const user = { id: profileId, nickname: 'CurrentUser', bannedUntil: null };
            const userStats = { wins: 5, winSeries: 1, totalGames: 8 };
            const currentUser = { id: currentUserId, nickname: 'CurrentUser' };
            const offers = [
                {
                    id: 'offer-1',
                    requester: { id: 'user-2', nickname: 'Requester1' },
                },
            ];
            const mockFriends = [
                { id: 'friend-1', nickname: 'Friend1', friendId: 'friend-1-id', isOnline: false }
            ];

            mockUserRepository.findOne
                .mockResolvedValueOnce(user)
                .mockResolvedValueOnce(currentUser);
            
            mockUserStatsRepository.findOne.mockResolvedValue(userStats);
            
            jest.spyOn(service, 'getFriends').mockResolvedValue(mockFriends as any);
            
            mockFriendRelationShipRepository.findOne.mockResolvedValue(null);
            mockReportRepository.findOne.mockResolvedValue(null);
            mockSocketConnectionService.getOnlinePlayers.mockResolvedValue([]);
            
            mockFriendRelationShipRepository.find.mockResolvedValueOnce(offers);

            const result = await service.profile(profileId, currentUserId);

            expect(result.offersFriendship).toEqual([
                { id: 'offer-1', nickname: 'Requester1', requesterId: 'user-2' },
            ]);
            
            jest.restoreAllMocks();
        });

        it('should throw UserNotFoundException if user not found', async () => {
            const profileId = 'non-existent';
            const currentUserId = 'user-1';

            mockUserRepository.findOne.mockResolvedValue(null);

            await expect(service.profile(profileId, currentUserId)).rejects.toThrow(
                UserNotFoundException,
            );
        });

        it('should throw UserStatsNotFoundException if stats not found', async () => {
            const profileId = 'user-2';
            const currentUserId = 'user-1';
            const user = { id: profileId, nickname: 'ProfileUser' };

            mockUserRepository.findOne.mockResolvedValue(user);
            mockUserStatsRepository.findOne.mockResolvedValue(null);

            await expect(service.profile(profileId, currentUserId)).rejects.toThrow(
                UserStatsNotFoundException,
            );
        });

        it('should throw UserNotFoundException for invalid UUID', async () => {
            (isValidUUID as jest.Mock).mockReturnValue(false);
            const profileId = 'invalid-uuid';
            const currentUserId = 'user-1';

            await expect(service.profile(profileId, currentUserId)).rejects.toThrow(
                UserNotFoundException,
            );
        });
    });

    describe('offerFriendship', () => {
        it('should create friendship offer', async () => {
            const friendId = 'user-2';
            const currentUserId = 'user-1';
            const friend = { id: friendId, nickname: 'Friend' };
            const currentUser = { id: currentUserId, nickname: 'CurrentUser' };
            const newRelation = { id: 'relation-1' };

            mockUserRepository.findOne
                .mockResolvedValueOnce(friend)
                .mockResolvedValueOnce(currentUser);
            mockFriendRelationShipRepository.create.mockReturnValue(newRelation);
            mockFriendRelationShipRepository.save.mockResolvedValue(newRelation);

            await service.offerFriendship(friendId, currentUserId);

            expect(mockFriendRelationShipRepository.create).toHaveBeenCalledWith({
                addresseeId: friendId,
                requesterId: currentUserId,
                status: RELATIONSHIP.OFFER,
            });
            expect(mockFriendRelationShipRepository.save).toHaveBeenCalledWith(newRelation);
        });

        it('should throw UserNotFoundException if friend not found', async () => {
            const friendId = 'non-existent';
            const currentUserId = 'user-1';

            mockUserRepository.findOne.mockResolvedValue(null);

            await expect(service.offerFriendship(friendId, currentUserId)).rejects.toThrow(
                UserNotFoundException,
            );
        });

        it('should throw InvalidFriendException if trying to befriend self', async () => {
            const friendId = 'user-1';
            const currentUserId = 'user-1';
            const user = { id: friendId };

            mockUserRepository.findOne.mockResolvedValue(user);

            await expect(service.offerFriendship(friendId, currentUserId)).rejects.toThrow(
                InvalidFriendException,
            );
        });
    });

    describe('acceptFriendship', () => {
        it('should accept friendship offer', async () => {
            const friendId = 'user-2';
            const currentUserId = 'user-1';
            const friendship = {
                id: 'friendship-1',
                status: RELATIONSHIP.OFFER,
            };

            mockFriendRelationShipRepository.findOne.mockResolvedValue(friendship);
            mockFriendRelationShipRepository.save.mockResolvedValue({
                ...friendship,
                status: RELATIONSHIP.FRIEND,
            });

            await service.acceptFriendship(friendId, currentUserId);

            expect(friendship.status).toBe(RELATIONSHIP.FRIEND);
            expect(mockFriendRelationShipRepository.save).toHaveBeenCalledWith(friendship);
        });

        it('should throw InvalidFriendException if trying to accept self', async () => {
            const friendId = 'user-1';
            const currentUserId = 'user-1';

            await expect(service.acceptFriendship(friendId, currentUserId)).rejects.toThrow(
                InvalidFriendException,
            );
        });

        it('should throw FriendshipNotFoundException if friendship not found', async () => {
            const friendId = 'user-2';
            const currentUserId = 'user-1';

            mockFriendRelationShipRepository.findOne.mockResolvedValue(null);

            await expect(service.acceptFriendship(friendId, currentUserId)).rejects.toThrow(
                FriendshipNotFoundException,
            );
        });
    });

    describe('breakoffFriendship', () => {
        it('should break off friendship', async () => {
            const friendId = 'user-2';
            const currentUserId = 'user-1';
            const friendship = { id: 'friendship-1' };

            mockFriendRelationShipRepository.findOne.mockResolvedValue(friendship);

            await service.breakoffFriendship(friendId, currentUserId);

            expect(mockFriendRelationShipRepository.softDelete).toHaveBeenCalledWith('friendship-1');
        });

        it('should throw InvalidFriendException if trying to breakoff self', async () => {
            const friendId = 'user-1';
            const currentUserId = 'user-1';

            await expect(service.breakoffFriendship(friendId, currentUserId)).rejects.toThrow(
                InvalidFriendException,
            );
        });

        it('should throw FriendshipNotFoundException if friendship not found', async () => {
            const friendId = 'user-2';
            const currentUserId = 'user-1';

            mockFriendRelationShipRepository.findOne.mockResolvedValue(null);

            await expect(service.breakoffFriendship(friendId, currentUserId)).rejects.toThrow(
                FriendshipNotFoundException,
            );
        });
    });

    describe('reportUser', () => {
        it('should create a report', async () => {
            const reportDto: ReportUserDto = {
                reportedUserId: 'user-2',
                text: 'Inappropriate behavior',
                reportType: 'HARASSMENT',
            };
            const currentUserId = 'user-1';
            const user = { id: 'user-2', nickname: 'ReportedUser' };
            const newReport = { id: 'report-1' };

            mockUserRepository.findOne.mockResolvedValue(user);
            mockReportRepository.create.mockReturnValue(newReport);
            mockReportRepository.save.mockResolvedValue(newReport);

            await service.reportUser(reportDto, currentUserId);

            expect(mockReportRepository.create).toHaveBeenCalledWith({
                reportedUserId: 'user-2',
                requesterUserId: currentUserId,
                text: 'Inappropriate behavior',
                reportType: 'HARASSMENT',
            });
            expect(mockReportRepository.save).toHaveBeenCalledWith(newReport);
        });

        it('should throw UserNotFoundException if reported user not found', async () => {
            const reportDto: ReportUserDto = {
                reportedUserId: 'non-existent',
                text: 'Test',
                reportType: 'OTHER',
            };
            const currentUserId = 'user-1';

            mockUserRepository.findOne.mockResolvedValue(null);

            await expect(service.reportUser(reportDto, currentUserId)).rejects.toThrow(
                UserNotFoundException,
            );
        });
    });

    describe('banUser', () => {
        it('should ban user and mark reports as processed', async () => {
            const banDto: BanUserDto = {
                bannedUserId: 'user-2',
                text: 'Spam',
                bannedUntil: '2025-12-31',
            };
            const user = { id: 'user-2', nickname: 'BadUser', banReason: null, bannedUntil: null };
            const reports = [
                { id: 'report-1', isProcessed: false },
                { id: 'report-2', isProcessed: false },
            ];

            mockUserRepository.findOne.mockResolvedValue(user);
            mockReportRepository.find.mockResolvedValue(reports);
            mockUserRepository.save.mockResolvedValue(user);
            mockReportRepository.save.mockResolvedValue({});

            await service.banUser(banDto);

            expect(user.banReason).toBe('Spam');
            expect(user.bannedUntil).toEqual(new Date('2025-12-31'));
            expect(mockUserRepository.save).toHaveBeenCalledWith(user);
            expect(reports[0].isProcessed).toBe(true);
            expect(reports[1].isProcessed).toBe(true);
            expect(mockReportRepository.save).toHaveBeenCalledTimes(2);
        });

        it('should throw UserNotFoundException if user not found', async () => {
            const banDto: BanUserDto = {
                bannedUserId: 'non-existent',
                text: 'Test',
                bannedUntil: '2025-12-31',
            };

            mockUserRepository.findOne.mockResolvedValue(null);

            await expect(service.banUser(banDto)).rejects.toThrow(UserNotFoundException);
        });
    });

    describe('unbanUser', () => {
        it('should unban user', async () => {
            const unbanDto: UnbanUserDto = { bannedUserId: 'user-2' };
            const user = {
                id: 'user-2',
                banReason: 'Spam',
                bannedUntil: new Date('2025-12-31'),
            };

            mockUserRepository.findOne.mockResolvedValue(user);
            mockUserRepository.save.mockResolvedValue({ ...user, banReason: null, bannedUntil: null });

            await service.unbanUser(unbanDto);

            expect(user.banReason).toBeNull();
            expect(user.bannedUntil).toBeNull();
            expect(mockUserRepository.save).toHaveBeenCalledWith(user);
        });

        it('should throw UserNotFoundException if user not found', async () => {
            const unbanDto: UnbanUserDto = { bannedUserId: 'non-existent' };

            mockUserRepository.findOne.mockResolvedValue(null);

            await expect(service.unbanUser(unbanDto)).rejects.toThrow(UserNotFoundException);
        });
    });

    describe('getReports', () => {
        it('should return paginated reports without filters', async () => {
            const getReportsDto: GetReportsDto = { page: 1, limit: 10 };
            const reports = [
                { id: 'report-1', text: 'Report 1' },
                { id: 'report-2', text: 'Report 2' },
            ];
            const queryBuilderMock = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getManyAndCount: jest.fn().mockResolvedValue([reports, 2]),
            };

            mockReportRepository.createQueryBuilder.mockReturnValue(queryBuilderMock);

            const result = await service.getReports(getReportsDto);

            expect(result).toEqual({
                data: reports,
                total: 2,
                page: 1,
                limit: 10,
                totalPages: 1,
            });
            expect(mockReportRepository.createQueryBuilder).toHaveBeenCalledWith('report');
        });

        it('should apply filters correctly', async () => {
            const getReportsDto: GetReportsDto = {
                page: 2,
                limit: 5,
                reportedUserId: 'user-2',
                isProcessed: true,
                startDate: '2024-01-01',
                endDate: '2024-12-31',
            };
            const reports = [{ id: 'report-1' }];
            const queryBuilderMock = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getManyAndCount: jest.fn().mockResolvedValue([reports, 1]),
            };

            mockReportRepository.createQueryBuilder.mockReturnValue(queryBuilderMock);

            await service.getReports(getReportsDto);

            expect(queryBuilderMock.andWhere).toHaveBeenCalledTimes(4);
            expect(queryBuilderMock.skip).toHaveBeenCalledWith(5);
            expect(queryBuilderMock.take).toHaveBeenCalledWith(5);
        });
    });

    describe('getAllUsers', () => {
        it('should return paginated users without filters', async () => {
            const getUsersDto: GetUsersDto = { page: 1, limit: 10 };
            const users = [
                { id: 'user-1', nickname: 'User1' },
                { id: 'user-2', nickname: 'User2' },
            ];
            const queryBuilderMock = {
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getManyAndCount: jest.fn().mockResolvedValue([users, 2]),
            };

            mockUserRepository.createQueryBuilder.mockReturnValue(queryBuilderMock);

            const result = await service.getAllUsers(getUsersDto);

            expect(result).toEqual({
                data: users,
                total: 2,
                page: 1,
                limit: 10,
                totalPages: 1,
            });
        });

        it('should apply filters correctly', async () => {
            const getUsersDto: GetUsersDto = {
                page: 1,
                limit: 20,
                userId: '123',
                isBanned: true,
                isAdmin: false,
            };
            const users = [{ id: 'user-123' }];
            const queryBuilderMock = {
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getManyAndCount: jest.fn().mockResolvedValue([users, 1]),
            };

            mockUserRepository.createQueryBuilder.mockReturnValue(queryBuilderMock);

            await service.getAllUsers(getUsersDto);

            expect(queryBuilderMock.andWhere).toHaveBeenCalledTimes(3);
        });
    });

    describe('setAdmin', () => {
        it('should set admin status', async () => {
            const setAdminDto: SetAdminDto = { userId: 'user-2', isAdmin: true };
            const user = { id: 'user-2', isAdmin: false };

            mockUserRepository.findOne.mockResolvedValue(user);
            mockUserRepository.save.mockResolvedValue({ ...user, isAdmin: true });

            await service.setAdmin(setAdminDto);

            expect(user.isAdmin).toBe(true);
            expect(mockUserRepository.save).toHaveBeenCalledWith(user);
        });

        it('should remove admin status', async () => {
            const setAdminDto: SetAdminDto = { userId: 'user-2', isAdmin: false };
            const user = { id: 'user-2', isAdmin: true };

            mockUserRepository.findOne.mockResolvedValue(user);
            mockUserRepository.save.mockResolvedValue({ ...user, isAdmin: false });

            await service.setAdmin(setAdminDto);

            expect(user.isAdmin).toBe(false);
            expect(mockUserRepository.save).toHaveBeenCalledWith(user);
        });

        it('should throw UserNotFoundException if user not found', async () => {
            const setAdminDto: SetAdminDto = { userId: 'non-existent', isAdmin: true };

            mockUserRepository.findOne.mockResolvedValue(null);

            await expect(service.setAdmin(setAdminDto)).rejects.toThrow(UserNotFoundException);
        });
    });
});