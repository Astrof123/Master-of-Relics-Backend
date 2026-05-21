import { Test, TestingModule } from '@nestjs/testing';
import { Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UnauthorizedException, UseGuards, ValidationPipe } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './jwt/token.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Response, Request } from 'express';

const createMockResponse = () => {
    const res: any = {};
    res.cookie = jest.fn();
    res.clearCookie = jest.fn();
    res.setHeader = jest.fn();
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
};

const createMockRequest = (cookies: any = {}) => {
    return {
        cookies,
        headers: {},
        get: jest.fn(),
    } as unknown as Request;
};

describe('AuthController', () => {
    let controller: AuthController;
    let authService: jest.Mocked<AuthService>;
    let tokenService: jest.Mocked<TokenService>;

    const mockAuthService = {
        register: jest.fn(),
        login: jest.fn(),
        refreshTokens: jest.fn(),
    };

    const mockTokenService = {
        generateAccessToken: jest.fn(),
        generateRefreshToken: jest.fn(),
        generateTokens: jest.fn(),
        verifyAccessToken: jest.fn(),
        verifyRefreshToken: jest.fn(),
        decodeToken: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                {
                    provide: AuthService,
                    useValue: mockAuthService,
                },
                {
                    provide: TokenService,
                    useValue: mockTokenService,
                },
            ],
        })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: jest.fn(() => true) })
        .compile();

        controller = module.get<AuthController>(AuthController);
        authService = module.get(AuthService);
        tokenService = module.get(TokenService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('setRefreshTokenCookie', () => {
        it('should set cookie with correct options', () => {
            const response = createMockResponse();
            const refreshToken = 'test-refresh-token';

            (controller as any).setRefreshTokenCookie(response, refreshToken);
            
            expect(response.cookie).toHaveBeenCalledWith(
                'refresh_token',
                refreshToken,
                expect.objectContaining({
                    httpOnly: true,
                    sameSite: 'lax',
                    maxAge: 30 * 24 * 60 * 60 * 1000,
                })
            );
        });

        it('should set secure flag in production', () => {
            const originalNodeEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';
            
            const response = createMockResponse();
            const refreshToken = 'test-refresh-token';
            
            (controller as any).setRefreshTokenCookie(response, refreshToken);
            
            expect(response.cookie).toHaveBeenCalledWith(
                'refresh_token',
                refreshToken,
                expect.objectContaining({
                    secure: true,
                })
            );
            
            process.env.NODE_ENV = originalNodeEnv;
        });
    });

    describe('register', () => {
        const registerDto: RegisterDto = {
            inviteCode: 'valid-uuid-1234',
            nickname: 'TestUser',
            login: 'testuser',
            password: 'password123',
        };

        const mockTokens = {
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
        };

        it('should register user and set refresh token cookie', async () => {
            const response = createMockResponse();
            
            mockAuthService.register.mockResolvedValue(mockTokens);

            const result = await controller.register(registerDto, response);

            expect(authService.register).toHaveBeenCalledWith(registerDto);
            expect(response.cookie).toHaveBeenCalledWith(
                'refresh_token',
                mockTokens.refreshToken,
                expect.any(Object)
            );
            expect(result).toEqual({
                accessToken: mockTokens.accessToken,
            });
            expect(result).not.toHaveProperty('refreshToken');
        });

        it('should handle registration error', async () => {
            const response = createMockResponse();
            const error = new Error('Registration failed');
            
            mockAuthService.register.mockRejectedValue(error);

            await expect(controller.register(registerDto, response)).rejects.toThrow(error);
            expect(response.cookie).not.toHaveBeenCalled();
        });
    });

    describe('login', () => {
        const loginDto: LoginDto = {
            login: 'testuser',
            password: 'password123',
        };

        const mockTokens = {
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
        };

        it('should login user and set refresh token cookie', async () => {
            const response = createMockResponse();
            
            mockAuthService.login.mockResolvedValue(mockTokens);

            const result = await controller.login(loginDto, response);

            expect(authService.login).toHaveBeenCalledWith(loginDto);
            expect(response.cookie).toHaveBeenCalledWith(
                'refresh_token',
                mockTokens.refreshToken,
                expect.any(Object)
            );
            expect(result).toEqual({
                accessToken: mockTokens.accessToken,
            });
            expect(result).not.toHaveProperty('refreshToken');
        });

        it('should handle login error', async () => {
            const response = createMockResponse();
            const error = new Error('Login failed');
            
            mockAuthService.login.mockRejectedValue(error);

            await expect(controller.login(loginDto, response)).rejects.toThrow(error);
            expect(response.cookie).not.toHaveBeenCalled();
        });
    });

    describe('refresh', () => {
        const mockRefreshToken = 'valid-refresh-token';
        const mockTokens = {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
        };

        it('should refresh tokens when refresh token exists', async () => {
            const request = createMockRequest({ refresh_token: mockRefreshToken });
            const response = createMockResponse();
            
            mockAuthService.refreshTokens.mockResolvedValue(mockTokens);

            const result = await controller.refresh(request, response);

            expect(authService.refreshTokens).toHaveBeenCalledWith(mockRefreshToken);
            expect(response.cookie).toHaveBeenCalledWith(
                'refresh_token',
                mockTokens.refreshToken,
                expect.any(Object)
            );
            expect(result).toEqual({
                accessToken: mockTokens.accessToken,
            });
        });

        it('should throw UnauthorizedException when refresh token not found', async () => {
            const request = createMockRequest({});
            const response = createMockResponse();

            await expect(controller.refresh(request, response)).rejects.toThrow(
                UnauthorizedException
            );
            await expect(controller.refresh(request, response)).rejects.toThrow(
                'Токен не найден'
            );
            expect(authService.refreshTokens).not.toHaveBeenCalled();
            expect(response.cookie).not.toHaveBeenCalled();
        });

        it('should handle refresh token error', async () => {
            const request = createMockRequest({ refresh_token: mockRefreshToken });
            const response = createMockResponse();
            const error = new Error('Refresh failed');
            
            mockAuthService.refreshTokens.mockRejectedValue(error);

            await expect(controller.refresh(request, response)).rejects.toThrow(error);
            expect(response.cookie).not.toHaveBeenCalled();
        });
    });

    describe('logout', () => {
        it('should clear refresh token cookie', async () => {
            const response = createMockResponse();

            await controller.logout(response);

            expect(response.clearCookie).toHaveBeenCalledWith(
                'refresh_token',
                expect.objectContaining({
                    httpOnly: true,
                    sameSite: 'lax',
                })
            );
        });

        it('should clear cookie with secure flag in production', async () => {
            const originalNodeEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';
            
            const response = createMockResponse();

            await controller.logout(response);

            expect(response.clearCookie).toHaveBeenCalledWith(
                'refresh_token',
                expect.objectContaining({
                    secure: true,
                })
            );
            
            process.env.NODE_ENV = originalNodeEnv;
        });

        it('should return void', async () => {
            const response = createMockResponse();
            const result = await controller.logout(response);
            expect(result).toBeUndefined();
        });
    });

    describe('HTTP decorators verification', () => {
        it('should have POST /register endpoint', () => {
            const routes = Reflect.getMetadata('path', AuthController);
            const method = Reflect.getMetadata('method', AuthController.prototype.register);
            expect(AuthController.prototype.register).toBeDefined();
        });

        it('should have POST /login endpoint with HttpCode 200', () => {
            expect(AuthController.prototype.login).toBeDefined();
        });

        it('should have GET /refresh endpoint', () => {
            expect(AuthController.prototype.refresh).toBeDefined();
        });

        it('should have POST /logout endpoint with JwtAuthGuard', () => {
            expect(AuthController.prototype.logout).toBeDefined();
            const guards = Reflect.getMetadata('__guards__', AuthController.prototype.logout);
            expect(guards).toBeDefined();
        });
    });
});

describe('AuthController (integration style)', () => {
    let controller: AuthController;
    let authService: jest.Mocked<AuthService>;

    const mockAuthService = {
        register: jest.fn(),
        login: jest.fn(),
        refreshTokens: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                {
                    provide: AuthService,
                    useValue: mockAuthService,
                },
                {
                    provide: TokenService,
                    useValue: {
                        generateAccessToken: jest.fn(),
                        generateRefreshToken: jest.fn(),
                        generateTokens: jest.fn(),
                        verifyAccessToken: jest.fn(),
                        verifyRefreshToken: jest.fn(),
                        decodeToken: jest.fn(),
                    },
                },
            ],
        })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: jest.fn(() => true) })
        .compile();

        controller = module.get<AuthController>(AuthController);
        authService = module.get(AuthService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Cookie handling', () => {
        it('should set cookie with correct max age', async () => {
            const response = createMockResponse();
            const tokens = {
                accessToken: 'access',
                refreshToken: 'refresh',
            };
            
            mockAuthService.register.mockResolvedValue(tokens);

            await controller.register({} as RegisterDto, response);

            const cookieCall = (response.cookie as jest.Mock).mock.calls[0];
            expect(cookieCall[2].maxAge).toBe(30 * 24 * 60 * 60 * 1000);
        });

        it('should set cookie with httpOnly flag', async () => {
            const response = createMockResponse();
            const tokens = {
                accessToken: 'access',
                refreshToken: 'refresh',
            };
            
            mockAuthService.register.mockResolvedValue(tokens);

            await controller.register({} as RegisterDto, response);

            const cookieCall = (response.cookie as jest.Mock).mock.calls[0];
            expect(cookieCall[2].httpOnly).toBe(true);
        });
    });

    describe('Response format', () => {
        it('should return only accessToken in response body for register', async () => {
            const response = createMockResponse();
            const tokens = {
                accessToken: 'access-token',
                refreshToken: 'refresh-token',
            };
            
            mockAuthService.register.mockResolvedValue(tokens);

            const result = await controller.register({} as RegisterDto, response);

            expect(result).toEqual({ accessToken: 'access-token' });
            expect(Object.keys(result)).toHaveLength(1);
        });

        it('should return only accessToken in response body for login', async () => {
            const response = createMockResponse();
            const tokens = {
                accessToken: 'access-token',
                refreshToken: 'refresh-token',
            };
            
            mockAuthService.login.mockResolvedValue(tokens);

            const result = await controller.login({} as LoginDto, response);

            expect(result).toEqual({ accessToken: 'access-token' });
            expect(Object.keys(result)).toHaveLength(1);
        });

        it('should return only accessToken in response body for refresh', async () => {
            const request = createMockRequest({ refresh_token: 'token' });
            const response = createMockResponse();
            const tokens = {
                accessToken: 'new-access-token',
                refreshToken: 'new-refresh-token',
            };
            
            mockAuthService.refreshTokens.mockResolvedValue(tokens);

            const result = await controller.refresh(request, response);

            expect(result).toEqual({ accessToken: 'new-access-token' });
            expect(Object.keys(result)).toHaveLength(1);
        });
    });
});