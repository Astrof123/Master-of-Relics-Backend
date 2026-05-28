import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserResponseDto } from './dto/user-response.dto';
import { FindFriendsDto } from './dto/find-friends.dto';
import { ReportUserDto } from './dto/report-user.dto';
import { GetReportsDto } from './dto/get-reports.dto';
import { BanUserDto } from './dto/ban-user.dto';
import { UnbanUserDto } from './dto/unban-user.dto';
import { SetAdminDto } from './dto/set-admin.dto';
import { GetUsersDto } from './dto/users.dto';
import { RELATIONSHIP } from './types/friend';
import { User } from './entities/user.entity';
import { Report } from './entities/report.entity';
import { UserStats } from './entities/user-stats.entity';
import { FriendRelationShip } from './entities/friend-relationship.entity';
import { UserProfileResponseDto } from './dto/user-profile-response.dto';

const createMockRequest = (userId: string): any => ({
    user: { userId },
    headers: {},
    body: {},
    query: {},
    params: {},
    get: jest.fn(),
    header: jest.fn(),
});

const createMockUser = (
    id: string,
    nickname: string,
    options?: Partial<User>,
): User => {
    const user = new User();
    user.id = id;
    user.nickname = nickname;
    user.login = `login_${id}`;
    user.friendCode = `CODE${id.slice(-10)}`;
    user.password = 'hashed_password';
    user.banReason = null;
    user.bannedUntil = null;
    user.createdAt = new Date();
    user.isAdmin = false;
    user.isSuperAdmin = false;
    user.gold = 0;
    user.collections = [];
    user.decks = [];
    user.reports = [];
    user.reportsSended = [];
    user.inviteCode = null as any;
    user.stats = null as any;
    user.requester = [];
    user.addressee = [];

    if (options) {
        Object.assign(user, options);
    }

    return user;
};

const createMockUserStats = (userId: string): UserStats => {
    const stats = new UserStats();
    stats.id = 1;
    stats.userId = userId;
    stats.totalGames = 10;
    stats.wins = 5;
    stats.winSeries = 2;
    stats.user = null as any;
    return stats;
};

const createMockReport = (
    id: number,
    text: string,
    reportedUserId: string,
    requesterUserId: string,
): Report => {
    const report = new Report();
    report.id = id;
    report.text = text;
    report.reportType = 'HARASSMENT';
    report.isProcessed = false;
    report.reportedUserId = reportedUserId;
    report.requesterUserId = requesterUserId;
    report.createdAt = new Date();
    report.reportedUser = null as any;
    report.requesterUser = null as any;
    return report;
};

const createMockGetAllUsersResponse = (
    users: User[],
    page: number = 1,
    limit: number = 10,
) => ({
    data: users,
    total: users.length,
    page,
    limit,
    totalPages: Math.ceil(users.length / limit),
});

const createMockGetReportsResponse = (
    reports: Report[],
    page: number = 1,
    limit: number = 10,
) => ({
    data: reports,
    total: reports.length,
    page,
    limit,
    totalPages: Math.ceil(reports.length / limit),
});

describe('UsersController', () => {
    let controller: UsersController;
    let usersService: jest.Mocked<UsersService>;

    const mockUsersService = {
        getAllUsers: jest.fn(),
        setAdmin: jest.fn(),
        getReports: jest.fn(),
        findOne: jest.fn(),
        profile: jest.fn(),
        findFriends: jest.fn(),
        offerFriendship: jest.fn(),
        acceptFriendship: jest.fn(),
        breakoffFriendship: jest.fn(),
        reportUser: jest.fn(),
        banUser: jest.fn(),
        unbanUser: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [UsersController],
            providers: [
                {
                    provide: UsersService,
                    useValue: mockUsersService,
                },
            ],
        }).compile();

        controller = module.get<UsersController>(UsersController);
        usersService = module.get(UsersService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getAllUsers', () => {
        it('should return paginated users with transformed DTOs', async () => {
            const request = createMockRequest('user-1');
            const getUsersDto: GetUsersDto = { page: 1, limit: 10 };
            const mockUsers = [
                createMockUser('user-1', 'User1', {
                    gold: 100,
                    isAdmin: false,
                }),
                createMockUser('user-2', 'User2', { gold: 200, isAdmin: true }),
            ];
            const mockResponse = createMockGetAllUsersResponse(mockUsers);

            usersService.getAllUsers.mockResolvedValue(mockResponse);

            const result = await controller.getAllUsers(request, getUsersDto);

            expect(usersService.getAllUsers).toHaveBeenCalledWith(getUsersDto);
            expect(result).toBeDefined();
            expect(result.data).toHaveLength(2);
            expect(result.total).toBe(2);
            expect(result.page).toBe(1);
            expect(result.limit).toBe(10);
            expect(result.totalPages).toBe(1);
            expect(result.data[0]).toBeInstanceOf(UserResponseDto);
        });

        it('should handle empty result', async () => {
            const request = createMockRequest('user-1');
            const getUsersDto: GetUsersDto = { page: 1, limit: 10 };
            const mockResponse = createMockGetAllUsersResponse([]);

            usersService.getAllUsers.mockResolvedValue(mockResponse);

            const result = await controller.getAllUsers(request, getUsersDto);

            expect(result.data).toEqual([]);
            expect(result.total).toBe(0);
        });

        it('should handle custom pagination parameters', async () => {
            const request = createMockRequest('user-1');
            const getUsersDto: GetUsersDto = { page: 2, limit: 20 };
            const mockUsers = [createMockUser('user-3', 'User3')];
            const mockResponse = createMockGetAllUsersResponse(
                mockUsers,
                2,
                20,
            );

            usersService.getAllUsers.mockResolvedValue(mockResponse);

            const result = await controller.getAllUsers(request, getUsersDto);

            expect(result.page).toBe(2);
            expect(result.limit).toBe(20);
        });
    });

    describe('setAdmin', () => {
        it('should set admin status', async () => {
            const request = createMockRequest('admin-1');
            const setAdminDto: SetAdminDto = {
                userId: 'user-2',
                isAdmin: true,
            };

            usersService.setAdmin.mockResolvedValue(undefined);

            await controller.setAdmin(request, setAdminDto);

            expect(usersService.setAdmin).toHaveBeenCalledWith(setAdminDto);
        });

        it('should remove admin status', async () => {
            const request = createMockRequest('admin-1');
            const setAdminDto: SetAdminDto = {
                userId: 'user-2',
                isAdmin: false,
            };

            usersService.setAdmin.mockResolvedValue(undefined);

            await controller.setAdmin(request, setAdminDto);

            expect(usersService.setAdmin).toHaveBeenCalledWith(setAdminDto);
        });
    });

    describe('getReports', () => {
        it('should return paginated reports with transformed DTOs', async () => {
            const request = createMockRequest('user-1');
            const getReportsDto: GetReportsDto = { page: 1, limit: 10 };
            const mockReports = [
                createMockReport(1, 'Report 1', 'user-2', 'user-1'),
                createMockReport(2, 'Report 2', 'user-3', 'user-1'),
            ];
            const mockResponse = createMockGetReportsResponse(mockReports);

            usersService.getReports.mockResolvedValue(mockResponse);

            const result = await controller.getReports(request, getReportsDto);

            expect(usersService.getReports).toHaveBeenCalledWith(getReportsDto);
            expect(result).toBeDefined();
            expect(result.data).toHaveLength(2);
            expect(result.total).toBe(2);
            expect(result.page).toBe(1);
            expect(result.limit).toBe(10);
        });

        it('should handle reports with filters', async () => {
            const request = createMockRequest('user-1');
            const getReportsDto: GetReportsDto = {
                page: 2,
                limit: 5,
                reportedUserId: 'user-3',
                isProcessed: false,
            };
            const mockReports = [
                createMockReport(1, 'Report 1', 'user-3', 'user-1'),
            ];
            const mockResponse = createMockGetReportsResponse(
                mockReports,
                2,
                5,
            );

            usersService.getReports.mockResolvedValue(mockResponse);

            const result = await controller.getReports(request, getReportsDto);

            expect(usersService.getReports).toHaveBeenCalledWith(getReportsDto);
            expect(result.page).toBe(2);
            expect(result.limit).toBe(5);
        });
    });

    describe('me', () => {
        it('should return current user data', async () => {
            const request = createMockRequest('user-1');
            const mockUser = createMockUser('user-1', 'TestUser', {
                gold: 500,
                isAdmin: false,
            });

            usersService.findOne.mockResolvedValue(mockUser);

            const result = await controller.me(request);

            expect(usersService.findOne).toHaveBeenCalledWith('user-1');
            expect(result).toBeInstanceOf(UserResponseDto);
            expect(result.id).toBe('user-1');
            expect(result.nickname).toBe('TestUser');
            expect(result.gold).toBe(500);
        });
    });

    describe('getProfile', () => {
        it('should return user profile by id', async () => {
            const request = createMockRequest('user-1');
            const profileId = 'user-2';
            const mockProfile: UserProfileResponseDto = {
                id: profileId,
                nickname: 'ProfileUser',
                isOnline: true,
                friends: [],
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
            };

            usersService.profile.mockResolvedValue(mockProfile);

            const result = await controller.getProfile(request, profileId);

            expect(usersService.profile).toHaveBeenCalledWith(
                profileId,
                'user-1',
            );
            expect(result).toEqual(mockProfile);
        });
    });

    describe('findAllForFriends', () => {
        it('should return users for friendship', async () => {
            const request = createMockRequest('user-1');
            const findFriendsDto: FindFriendsDto = { searchQuery: 'FRIEND123' };
            const mockUsers = [
                createMockUser('user-2', 'Friend1'),
                createMockUser('user-3', 'Friend2'),
            ];

            usersService.findFriends.mockResolvedValue(mockUsers);

            const result = await controller.findAllForFriends(
                request,
                findFriendsDto,
            );

            expect(usersService.findFriends).toHaveBeenCalledWith(
                findFriendsDto,
                'user-1',
            );
            expect(result).toHaveLength(2);
            expect(result[0]).toBeInstanceOf(UserResponseDto);
        });

        it('should return empty array when no users found', async () => {
            const request = createMockRequest('user-1');
            const findFriendsDto: FindFriendsDto = { searchQuery: 'NOBODY' };

            usersService.findFriends.mockResolvedValue([]);

            const result = await controller.findAllForFriends(
                request,
                findFriendsDto,
            );

            expect(result).toEqual([]);
        });
    });

    describe('offerFriendship', () => {
        it('should offer friendship', async () => {
            const request = createMockRequest('user-1');
            const friendId = 'user-2';

            usersService.offerFriendship.mockResolvedValue(undefined);

            await controller.offerFriendship(request, friendId);

            expect(usersService.offerFriendship).toHaveBeenCalledWith(
                friendId,
                'user-1',
            );
        });
    });

    describe('acceptFriendship', () => {
        it('should accept friendship', async () => {
            const request = createMockRequest('user-1');
            const friendId = 'user-2';

            usersService.acceptFriendship.mockResolvedValue(undefined);

            await controller.acceptFriendship(request, friendId);

            expect(usersService.acceptFriendship).toHaveBeenCalledWith(
                friendId,
                'user-1',
            );
        });
    });

    describe('declineFriendship', () => {
        it('should decline friendship (uses breakoffFriendship)', async () => {
            const request = createMockRequest('user-1');
            const friendId = 'user-2';

            usersService.breakoffFriendship.mockResolvedValue(undefined);

            await controller.declineFriendship(request, friendId);

            expect(usersService.breakoffFriendship).toHaveBeenCalledWith(
                friendId,
                'user-1',
            );
        });
    });

    describe('breakoffFriendship', () => {
        it('should break off friendship', async () => {
            const request = createMockRequest('user-1');
            const friendId = 'user-2';

            usersService.breakoffFriendship.mockResolvedValue(undefined);

            await controller.breakoffFriendship(request, friendId);

            expect(usersService.breakoffFriendship).toHaveBeenCalledWith(
                friendId,
                'user-1',
            );
        });
    });

    describe('reportPlayer', () => {
        it('should report a player', async () => {
            const request = createMockRequest('user-1');
            const reportUserDto: ReportUserDto = {
                reportedUserId: 'user-2',
                text: 'Inappropriate behavior',
                reportType: 'HARASSMENT',
            };

            usersService.reportUser.mockResolvedValue(undefined);

            await controller.reportPlayer(request, reportUserDto);

            expect(usersService.reportUser).toHaveBeenCalledWith(
                reportUserDto,
                'user-1',
            );
        });
    });

    describe('banPlayer', () => {
        it('should ban a player', async () => {
            const banUserDto: BanUserDto = {
                bannedUserId: 'user-2',
                text: 'Spam',
                bannedUntil: '2025-12-31',
            };

            usersService.banUser.mockResolvedValue(undefined);

            await controller.banPlayer(banUserDto);

            expect(usersService.banUser).toHaveBeenCalledWith(banUserDto);
        });
    });

    describe('unbanPlayer', () => {
        it('should unban a player', async () => {
            const unbanUserDto: UnbanUserDto = {
                bannedUserId: 'user-2',
            };

            usersService.unbanUser.mockResolvedValue(undefined);

            await controller.unbanPlayer(unbanUserDto);

            expect(usersService.unbanUser).toHaveBeenCalledWith(unbanUserDto);
        });
    });

    describe('findUserById', () => {
        it('should return user by id', async () => {
            const userId = 'user-1';
            const mockUser = createMockUser(userId, 'TestUser', { gold: 1000 });

            usersService.findOne.mockResolvedValue(mockUser);

            const result = await controller.findUserById(userId);

            expect(usersService.findOne).toHaveBeenCalledWith(userId);
            expect(result).toBeInstanceOf(UserResponseDto);
            expect(result.id).toBe(userId);
            expect(result.nickname).toBe('TestUser');
        });
    });

    describe('Error handling', () => {
        it('should handle service errors gracefully', async () => {
            const request = createMockRequest('user-1');
            const error = new Error('Service error');

            usersService.findOne.mockRejectedValue(error);

            await expect(controller.me(request)).rejects.toThrow(
                'Service error',
            );
        });

        it('should handle not found error', async () => {
            const userId = 'non-existent';
            const error = new Error('User not found');

            usersService.findOne.mockRejectedValue(error);

            await expect(controller.findUserById(userId)).rejects.toThrow(
                'User not found',
            );
        });
    });
});
