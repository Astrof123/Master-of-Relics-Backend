import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
    UnauthorizedException,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { TokenService } from './jwt/token.service';
import { CollectionService } from '../collection/collection.service';
import { DeckService } from '../collection/deck.service';
import { User } from '../users/entities/user.entity';
import { UserStats } from '../users/entities/user-stats.entity';
import { InviteCode } from '../invite-code/entities/invite-code.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
    InvalidCredentialsException,
    InvalidInviteCodeException,
    UsedInviteCodeException,
    UserAlreadyExistsException,
} from './exceptions/auth.exception';
import { INVITE_CODE_STATUS } from '../invite-code/types/invite-code';
import { AuthRateLimitService } from './auth-rate-limit.service';
import * as bcrypt from 'bcrypt';
import { validate as isValidUUID } from 'uuid';

jest.mock('bcrypt');
jest.mock('uuid');

describe('AuthService', () => {
    let service: AuthService;
    let usersRepository: jest.Mocked<Repository<User>>;
    let userStatsRepository: jest.Mocked<Repository<UserStats>>;
    let inviteCodeRepository: jest.Mocked<Repository<InviteCode>>;
    let tokenService: jest.Mocked<TokenService>;
    let collectionService: jest.Mocked<CollectionService>;
    let deckService: jest.Mocked<DeckService>;
    let rateLimitService: jest.Mocked<AuthRateLimitService>;

    const mockUsersRepository = {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        exists: jest.fn(),
    };

    const mockUserStatsRepository = {
        create: jest.fn(),
        save: jest.fn(),
    };

    const mockInviteCodeRepository = {
        findOne: jest.fn(),
        save: jest.fn(),
        create: jest.fn(),
    };

    const mockTokenService = {
        generateTokens: jest.fn(),
        verifyRefreshToken: jest.fn(),
    };

    const mockCollectionService = {
        createForNewUser: jest.fn(),
    };

    const mockDeckService = {
        createForNewUser: jest.fn(),
    };

    const mockRateLimitService = {
        checkGlobalIpLimit: jest.fn(),
        checkAndRecordFailedAttempt: jest.fn(),
        clearFailedAttempts: jest.fn(),
        recordGlobalIpAttempt: jest.fn(),
    };

    const createMockInviteCode = (
        id: string,
        status: string = INVITE_CODE_STATUS.FREE,
    ): InviteCode => {
        const inviteCode = new InviteCode();
        inviteCode.id = id;
        inviteCode.status = status as any;
        inviteCode.userId = undefined;
        inviteCode.user = undefined;
        inviteCode.usedAt = undefined;
        inviteCode.createdAt = new Date();
        inviteCode.deletedAt = undefined;
        return inviteCode;
    };

    const createMockUser = (
        id: string,
        login: string,
        nickname: string,
    ): User => {
        const user = new User();
        user.id = id;
        user.login = login;
        user.nickname = nickname;
        user.password = 'hashed_password';
        user.friendCode = '1234567890';
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
        return user;
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: getRepositoryToken(User),
                    useValue: mockUsersRepository,
                },
                {
                    provide: getRepositoryToken(UserStats),
                    useValue: mockUserStatsRepository,
                },
                {
                    provide: getRepositoryToken(InviteCode),
                    useValue: mockInviteCodeRepository,
                },
                {
                    provide: TokenService,
                    useValue: mockTokenService,
                },
                {
                    provide: CollectionService,
                    useValue: mockCollectionService,
                },
                {
                    provide: DeckService,
                    useValue: mockDeckService,
                },
                {
                    provide: AuthRateLimitService,
                    useValue: mockRateLimitService,
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        usersRepository = module.get(getRepositoryToken(User));
        userStatsRepository = module.get(getRepositoryToken(UserStats));
        inviteCodeRepository = module.get(getRepositoryToken(InviteCode));
        tokenService = module.get(TokenService);
        collectionService = module.get(CollectionService);
        deckService = module.get(DeckService);
        rateLimitService = module.get(AuthRateLimitService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('generateFriendCode', () => {
        it('should generate a 10-digit friend code', () => {
            const generateFriendCode = (service as any).generateFriendCode.bind(
                service,
            );
            const code = generateFriendCode();
            expect(code).toHaveLength(10);
            expect(/^\d+$/.test(code)).toBe(true);
        });
    });

    describe('register', () => {
        const registerDto: RegisterDto = {
            inviteCode: 'valid-uuid-1234',
            nickname: 'TestUser',
            login: 'testuser',
            password: 'password123',
        };

        const mockUserId = 'user-123';
        const mockTokens = {
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
        };

        beforeEach(() => {
            (isValidUUID as jest.Mock).mockReturnValue(true);
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
            mockTokenService.generateTokens.mockResolvedValue(mockTokens);
            mockCollectionService.createForNewUser.mockResolvedValue(undefined);
            mockDeckService.createForNewUser.mockResolvedValue(undefined);
        });

        it('should successfully register a new user', async () => {
            const mockInviteCode = createMockInviteCode(
                registerDto.inviteCode,
                INVITE_CODE_STATUS.FREE,
            );
            const mockUser = createMockUser(
                mockUserId,
                registerDto.login,
                registerDto.nickname,
            );
            const mockUserStats = { userId: mockUserId } as UserStats;

            mockUsersRepository.findOne.mockResolvedValue(null);
            mockInviteCodeRepository.findOne.mockResolvedValue(mockInviteCode);
            mockUsersRepository.exists.mockResolvedValue(false);
            mockUsersRepository.create.mockReturnValue(mockUser);
            mockUsersRepository.save.mockResolvedValue(mockUser);
            mockUserStatsRepository.create.mockReturnValue(mockUserStats);
            mockUserStatsRepository.save.mockResolvedValue(mockUserStats);
            mockInviteCodeRepository.save.mockResolvedValue(mockInviteCode);

            const result = await service.register(registerDto);

            expect(result).toEqual(mockTokens);
            expect(mockUsersRepository.findOne).toHaveBeenCalledWith({
                where: { login: registerDto.login },
            });
            expect(mockInviteCodeRepository.findOne).toHaveBeenCalledWith({
                where: { id: registerDto.inviteCode },
            });
            expect(mockUsersRepository.exists).toHaveBeenCalled();
            expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
            expect(mockUsersRepository.create).toHaveBeenCalled();
            expect(mockUsersRepository.save).toHaveBeenCalled();
            expect(mockUserStatsRepository.create).toHaveBeenCalledWith({
                userId: mockUserId,
            });
            expect(mockUserStatsRepository.save).toHaveBeenCalled();
            expect(mockInviteCodeRepository.save).toHaveBeenCalled();
            expect(mockCollectionService.createForNewUser).toHaveBeenCalledWith(
                mockUserId,
            );
            expect(mockDeckService.createForNewUser).toHaveBeenCalledWith(
                mockUserId,
            );
            expect(mockTokenService.generateTokens).toHaveBeenCalledWith({
                sub: mockUserId,
            });
        });

        it('should throw UserAlreadyExistsException if user already exists', async () => {
            const existingUser = createMockUser(
                'existing-user',
                registerDto.login,
                'ExistingUser',
            );

            mockUsersRepository.findOne.mockResolvedValue(existingUser);

            await expect(service.register(registerDto)).rejects.toThrow(
                UserAlreadyExistsException,
            );
            expect(mockInviteCodeRepository.findOne).not.toHaveBeenCalled();
            expect(mockUsersRepository.save).not.toHaveBeenCalled();
        });

        it('should throw InvalidInviteCodeException if invite code is invalid UUID', async () => {
            (isValidUUID as jest.Mock).mockReturnValue(false);
            mockUsersRepository.findOne.mockResolvedValue(null);

            await expect(service.register(registerDto)).rejects.toThrow(
                InvalidInviteCodeException,
            );
            expect(mockInviteCodeRepository.findOne).not.toHaveBeenCalled();
            expect(mockUsersRepository.save).not.toHaveBeenCalled();
        });

        it('should throw InvalidInviteCodeException if invite code not found', async () => {
            mockUsersRepository.findOne.mockResolvedValue(null);
            mockInviteCodeRepository.findOne.mockResolvedValue(null);

            await expect(service.register(registerDto)).rejects.toThrow(
                InvalidInviteCodeException,
            );
            expect(mockUsersRepository.save).not.toHaveBeenCalled();
        });

        it('should throw UsedInviteCodeException if invite code is already used', async () => {
            const usedInviteCode = createMockInviteCode(
                registerDto.inviteCode,
                INVITE_CODE_STATUS.USED,
            );
            usedInviteCode.userId = 'existing-user-id';

            mockUsersRepository.findOne.mockResolvedValue(null);
            mockInviteCodeRepository.findOne.mockResolvedValue(usedInviteCode);

            await expect(service.register(registerDto)).rejects.toThrow(
                UsedInviteCodeException,
            );
            expect(mockUsersRepository.save).not.toHaveBeenCalled();
        });

        it('should generate unique friend code', async () => {
            const mockInviteCode = createMockInviteCode(
                registerDto.inviteCode,
                INVITE_CODE_STATUS.FREE,
            );
            const mockUser = createMockUser(
                mockUserId,
                registerDto.login,
                registerDto.nickname,
            );
            const mockUserStats = { userId: mockUserId } as UserStats;

            mockUsersRepository.findOne.mockResolvedValue(null);
            mockInviteCodeRepository.findOne.mockResolvedValue(mockInviteCode);
            mockUsersRepository.exists
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(false);
            mockUsersRepository.create.mockReturnValue(mockUser);
            mockUsersRepository.save.mockResolvedValue(mockUser);
            mockUserStatsRepository.create.mockReturnValue(mockUserStats);
            mockUserStatsRepository.save.mockResolvedValue(mockUserStats);
            mockInviteCodeRepository.save.mockResolvedValue(mockInviteCode);

            await service.register(registerDto);

            expect(mockUsersRepository.exists).toHaveBeenCalledTimes(2);
        });

        it('should update invite code with user info on successful registration', async () => {
            const mockInviteCode = createMockInviteCode(
                registerDto.inviteCode,
                INVITE_CODE_STATUS.FREE,
            );
            const mockUser = createMockUser(
                mockUserId,
                registerDto.login,
                registerDto.nickname,
            );
            const mockUserStats = { userId: mockUserId } as UserStats;

            mockUsersRepository.findOne.mockResolvedValue(null);
            mockInviteCodeRepository.findOne.mockResolvedValue(mockInviteCode);
            mockUsersRepository.exists.mockResolvedValue(false);
            mockUsersRepository.create.mockReturnValue(mockUser);
            mockUsersRepository.save.mockResolvedValue(mockUser);
            mockUserStatsRepository.create.mockReturnValue(mockUserStats);
            mockUserStatsRepository.save.mockResolvedValue(mockUserStats);
            mockInviteCodeRepository.save.mockResolvedValue(mockInviteCode);

            await service.register(registerDto);

            expect(mockInviteCode.userId).toBe(mockUserId);
            expect(mockInviteCode.usedAt).toBeInstanceOf(Date);
            expect(mockInviteCode.status).toBe(INVITE_CODE_STATUS.USED);
            expect(mockInviteCodeRepository.save).toHaveBeenCalledWith(
                mockInviteCode,
            );
        });

        it('should handle unexpected errors and throw internal server error', async () => {
            mockUsersRepository.findOne.mockRejectedValue(
                new Error('Database error'),
            );

            await expect(service.register(registerDto)).rejects.toThrow(
                'Ошибка при регистрации пользователя',
            );
        });
    });

    describe('login', () => {
        const loginDto: LoginDto = {
            login: 'testuser',
            password: 'password123',
        };
        const ip = '127.0.0.1';

        const mockUserId = 'user-123';
        const mockTokens = {
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
        };

        beforeEach(() => {
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            mockTokenService.generateTokens.mockResolvedValue(mockTokens);
        });

        it('should successfully login with valid credentials', async () => {
            const mockUser = createMockUser(
                mockUserId,
                loginDto.login,
                'TestUser',
            );
            mockUser.password = 'hashed_password';

            mockUsersRepository.findOne.mockResolvedValue(mockUser);
            mockRateLimitService.checkGlobalIpLimit.mockResolvedValue({
                allowed: true,
            });
            mockRateLimitService.checkAndRecordFailedAttempt.mockResolvedValue({
                allowed: true,
            });
            mockRateLimitService.clearFailedAttempts.mockResolvedValue(undefined);
            mockRateLimitService.recordGlobalIpAttempt.mockResolvedValue(undefined);

            const result = await service.login(loginDto, ip);

            expect(result).toEqual(mockTokens);
            expect(mockRateLimitService.checkGlobalIpLimit).toHaveBeenCalledWith(ip);
            expect(mockRateLimitService.checkAndRecordFailedAttempt).toHaveBeenCalledWith(loginDto.login, ip);
            expect(mockUsersRepository.findOne).toHaveBeenCalledWith({
                where: { login: loginDto.login },
            });
            expect(bcrypt.compare).toHaveBeenCalledWith(
                loginDto.password,
                mockUser.password,
            );
            expect(mockRateLimitService.clearFailedAttempts).toHaveBeenCalledWith(loginDto.login, ip);
            expect(mockRateLimitService.recordGlobalIpAttempt).toHaveBeenCalledWith(ip);
            expect(mockTokenService.generateTokens).toHaveBeenCalledWith({
                sub: mockUserId,
            });
        });

        it('should throw UnauthorizedException if global IP limit exceeded', async () => {
            mockRateLimitService.checkGlobalIpLimit.mockResolvedValue({
                allowed: false,
                message: 'С вашего IP слишком много попыток',
            });

            await expect(service.login(loginDto, ip)).rejects.toThrow(
                UnauthorizedException,
            );
            expect(mockUsersRepository.findOne).not.toHaveBeenCalled();
        });

        it('should throw UnauthorizedException if rate limit check fails', async () => {
            mockRateLimitService.checkGlobalIpLimit.mockResolvedValue({
                allowed: true,
            });
            mockRateLimitService.checkAndRecordFailedAttempt.mockResolvedValue({
                allowed: false,
                message: 'Слишком много неудачных попыток',
            });

            await expect(service.login(loginDto, ip)).rejects.toThrow(
                UnauthorizedException,
            );
            expect(mockUsersRepository.findOne).not.toHaveBeenCalled();
        });

        it('should throw InvalidCredentialsException if user not found', async () => {
            mockRateLimitService.checkGlobalIpLimit.mockResolvedValue({
                allowed: true,
            });
            mockRateLimitService.checkAndRecordFailedAttempt.mockResolvedValue({
                allowed: true,
            });
            mockUsersRepository.findOne.mockResolvedValue(null);

            await expect(service.login(loginDto, ip)).rejects.toThrow(
                InvalidCredentialsException,
            );
            expect(bcrypt.compare).not.toHaveBeenCalled();
            expect(mockTokenService.generateTokens).not.toHaveBeenCalled();
            expect(mockRateLimitService.clearFailedAttempts).not.toHaveBeenCalled();
        });

        it('should throw InvalidCredentialsException if password is invalid', async () => {
            const mockUser = createMockUser(
                mockUserId,
                loginDto.login,
                'TestUser',
            );
            mockUser.password = 'hashed_password';

            mockRateLimitService.checkGlobalIpLimit.mockResolvedValue({
                allowed: true,
            });
            mockRateLimitService.checkAndRecordFailedAttempt.mockResolvedValue({
                allowed: true,
                message: 'Неверный пароль',
            });
            mockUsersRepository.findOne.mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(service.login(loginDto, ip)).rejects.toThrow(
                InvalidCredentialsException,
            );
            expect(mockTokenService.generateTokens).not.toHaveBeenCalled();
            expect(mockRateLimitService.clearFailedAttempts).not.toHaveBeenCalled();
        });

    });

    describe('refreshTokens', () => {
        const refreshToken = 'valid-refresh-token';
        const mockUserId = 'user-123';
        const mockTokens = {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
        };
        const mockPayload = { sub: mockUserId };

        beforeEach(() => {
            mockTokenService.verifyRefreshToken.mockResolvedValue(mockPayload);
            mockTokenService.generateTokens.mockResolvedValue(mockTokens);
        });

        it('should successfully refresh tokens', async () => {
            const mockUser = createMockUser(mockUserId, 'testuser', 'TestUser');

            mockUsersRepository.findOne.mockResolvedValue(mockUser);

            const result = await service.refreshTokens(refreshToken);

            expect(result).toEqual(mockTokens);
            expect(mockTokenService.verifyRefreshToken).toHaveBeenCalledWith(
                refreshToken,
            );
            expect(mockUsersRepository.findOne).toHaveBeenCalledWith({
                where: { id: mockUserId },
            });
            expect(mockTokenService.generateTokens).toHaveBeenCalledWith({
                sub: mockUserId,
            });
        });

        it('should throw UnauthorizedException if refresh token is invalid', async () => {
            mockTokenService.verifyRefreshToken.mockRejectedValue(
                new UnauthorizedException('Невалидный refresh token'),
            );

            await expect(service.refreshTokens(refreshToken)).rejects.toThrow(
                UnauthorizedException,
            );
            expect(mockUsersRepository.findOne).not.toHaveBeenCalled();
        });

        it('should throw UnauthorizedException if user not found', async () => {
            mockTokenService.verifyRefreshToken.mockResolvedValue(mockPayload);
            mockUsersRepository.findOne.mockResolvedValue(null);

            await expect(service.refreshTokens(refreshToken)).rejects.toThrow(
                UnauthorizedException,
            );
            expect(mockTokenService.generateTokens).not.toHaveBeenCalled();
        });

        it('should handle unexpected errors and throw internal server error', async () => {
            mockTokenService.verifyRefreshToken.mockRejectedValue(
                new Error('Unexpected error'),
            );

            await expect(service.refreshTokens(refreshToken)).rejects.toThrow(
                'Ошибка на стороне сервера',
            );
        });
    });
});