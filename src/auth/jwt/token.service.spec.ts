import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenService } from './token.service';

describe('TokenService', () => {
  let service: TokenService;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
    decode: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateAccessToken', () => {
    const payload = { sub: 'user-123', username: 'testuser' };
    const accessSecret = 'access-secret-key';
    const accessExpiresIn = '15m';

    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'jwt.accessSecret') return accessSecret;
        if (key === 'jwt.accessExpiresIn') return accessExpiresIn;
        return null;
      });
    });

    it('should generate access token successfully', async () => {
      const expectedToken = 'generated-access-token';
      mockJwtService.signAsync.mockResolvedValue(expectedToken);

      const result = await service.generateAccessToken(payload);

      expect(mockConfigService.get).toHaveBeenCalledWith('jwt.accessSecret');
      expect(mockConfigService.get).toHaveBeenCalledWith('jwt.accessExpiresIn');
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(payload, {
        secret: accessSecret,
        expiresIn: accessExpiresIn,
      });
      expect(result).toBe(expectedToken);
    });

    it('should handle different payload structures', async () => {
      const differentPayload = { userId: '456', role: 'admin' };
      const expectedToken = 'different-token';
      mockJwtService.signAsync.mockResolvedValue(expectedToken);

      const result = await service.generateAccessToken(differentPayload);

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(differentPayload, {
        secret: accessSecret,
        expiresIn: accessExpiresIn,
      });
      expect(result).toBe(expectedToken);
    });
  });

  describe('generateRefreshToken', () => {
    const payload = { sub: 'user-123', username: 'testuser' };
    const refreshSecret = 'refresh-secret-key';
    const refreshExpiresIn = '7d';

    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'jwt.refreshSecret') return refreshSecret;
        if (key === 'jwt.refreshExpiresIn') return refreshExpiresIn;
        return null;
      });
    });

    it('should generate refresh token successfully', async () => {
      const expectedToken = 'generated-refresh-token';
      mockJwtService.signAsync.mockResolvedValue(expectedToken);

      const result = await service.generateRefreshToken(payload);

      expect(mockConfigService.get).toHaveBeenCalledWith('jwt.refreshSecret');
      expect(mockConfigService.get).toHaveBeenCalledWith('jwt.refreshExpiresIn');
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn,
      });
      expect(result).toBe(expectedToken);
    });
  });

  describe('generateTokens', () => {
    const payload = { sub: 'user-123', username: 'testuser' };
    const accessToken = 'access-token-123';
    const refreshToken = 'refresh-token-456';

    beforeEach(() => {
      mockJwtService.signAsync
        .mockResolvedValueOnce(accessToken)
        .mockResolvedValueOnce(refreshToken);
      
      mockConfigService.get.mockImplementation((key: string) => {
        if (key.includes('accessSecret')) return 'access-secret';
        if (key.includes('accessExpiresIn')) return '15m';
        if (key.includes('refreshSecret')) return 'refresh-secret';
        if (key.includes('refreshExpiresIn')) return '7d';
        return null;
      });
    });

    it('should generate both tokens successfully', async () => {
      const result = await service.generateTokens(payload);

      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        accessToken,
        refreshToken,
      });
    });

    it('should call generateAccessToken and generateRefreshToken internally', async () => {
      const generateAccessTokenSpy = jest.spyOn(service, 'generateAccessToken');
      const generateRefreshTokenSpy = jest.spyOn(service, 'generateRefreshToken');

      await service.generateTokens(payload);

      expect(generateAccessTokenSpy).toHaveBeenCalledWith(payload);
      expect(generateRefreshTokenSpy).toHaveBeenCalledWith(payload);
    });
  });

  describe('verifyAccessToken', () => {
    const token = 'valid-access-token';
    const accessSecret = 'access-secret-key';
    const expectedPayload = { sub: 'user-123', iat: 1234567890, exp: 1234567890 };

    beforeEach(() => {
      mockConfigService.get.mockReturnValue(accessSecret);
    });

    it('should verify and return payload for valid token', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(expectedPayload);

      const result = await service.verifyAccessToken(token);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(token, {
        secret: accessSecret,
      });
      expect(result).toEqual(expectedPayload);
    });

    it('should return null for invalid token', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      const result = await service.verifyAccessToken(token);

      expect(result).toBeNull();
    });

    it('should return null for expired token', async () => {
      const expiredError = new Error('jwt expired');
      mockJwtService.verifyAsync.mockRejectedValue(expiredError);

      const result = await service.verifyAccessToken(token);

      expect(result).toBeNull();
    });

    it('should handle malformed token', async () => {
      const malformedError = new Error('jwt malformed');
      mockJwtService.verifyAsync.mockRejectedValue(malformedError);

      const result = await service.verifyAccessToken('malformed-token');

      expect(result).toBeNull();
    });
  });

  describe('verifyRefreshToken', () => {
    const token = 'valid-refresh-token';
    const refreshSecret = 'refresh-secret-key';
    const expectedPayload = { sub: 'user-123', iat: 1234567890, exp: 1234567890 };

    beforeEach(() => {
      mockConfigService.get.mockReturnValue(refreshSecret);
    });

    it('should verify and return payload for valid token', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(expectedPayload);

      const result = await service.verifyRefreshToken(token);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(token, {
        secret: refreshSecret,
      });
      expect(result).toEqual(expectedPayload);
    });

    it('should return null for invalid token', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      const result = await service.verifyRefreshToken(token);

      expect(result).toBeNull();
    });

    it('should return null for expired refresh token', async () => {
      const expiredError = new Error('jwt expired');
      mockJwtService.verifyAsync.mockRejectedValue(expiredError);

      const result = await service.verifyRefreshToken(token);

      expect(result).toBeNull();
    });
  });

  describe('decodeToken', () => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJuYW1lIjoiSm9obiBEb2UiLCJpYXQiOjE1MTYyMzkwMjJ9';
    const decodedPayload = { sub: '123', name: 'John Doe', iat: 1516239022 };

    it('should decode token successfully', () => {
      mockJwtService.decode.mockReturnValue(decodedPayload);

      const result = service.decodeToken(token);

      expect(mockJwtService.decode).toHaveBeenCalledWith(token);
      expect(result).toEqual(decodedPayload);
    });

    it('should return null for invalid token', () => {
      mockJwtService.decode.mockReturnValue(null);

      const result = service.decodeToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should decode token without verification', () => {
      const malformedToken = 'malformed.token.here';
      mockJwtService.decode.mockReturnValue(null);

      const result = service.decodeToken(malformedToken);

      expect(mockJwtService.decode).toHaveBeenCalledWith(malformedToken);
      expect(result).toBeNull();
    });
  });

  describe('Integration with different config values', () => {
    it('should handle missing config values gracefully', async () => {
      mockConfigService.get.mockReturnValue(undefined);
      
      const payload = { sub: 'test' };
      
      mockJwtService.signAsync.mockResolvedValue('token');
      
      await expect(service.generateAccessToken(payload)).resolves.toBe('token');
      await expect(service.generateRefreshToken(payload)).resolves.toBe('token');
    });

    it('should use different expiry times for access and refresh tokens', async () => {
      const accessExpiresIn = '15m';
      const refreshExpiresIn = '7d';
      
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'jwt.accessExpiresIn') return accessExpiresIn;
        if (key === 'jwt.refreshExpiresIn') return refreshExpiresIn;
        if (key === 'jwt.accessSecret') return 'access-secret';
        if (key === 'jwt.refreshSecret') return 'refresh-secret';
        return null;
      });
      
      mockJwtService.signAsync.mockResolvedValue('token');
      
      await service.generateAccessToken({ sub: 'test' });
      await service.generateRefreshToken({ sub: 'test' });
      
      const accessCall = mockJwtService.signAsync.mock.calls[0];
      const refreshCall = mockJwtService.signAsync.mock.calls[1];
      
      expect(accessCall[1].expiresIn).toBe(accessExpiresIn);
      expect(refreshCall[1].expiresIn).toBe(refreshExpiresIn);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty payload', async () => {
      mockJwtService.signAsync.mockResolvedValue('token');
      mockConfigService.get.mockReturnValue('secret');

      const result = await service.generateAccessToken({});
      
      expect(result).toBe('token');
      expect(mockJwtService.signAsync).toHaveBeenCalledWith({}, expect.any(Object));
    });

    it('should handle null payload', async () => {
      mockJwtService.signAsync.mockResolvedValue('token');
      mockConfigService.get.mockReturnValue('secret');

      const result = await service.generateAccessToken(null);
      
      expect(result).toBe('token');
    });

    it('should handle very large payload', async () => {
      const largePayload = { data: 'x'.repeat(10000) };
      mockJwtService.signAsync.mockResolvedValue('large-token');
      mockConfigService.get.mockReturnValue('secret');

      const result = await service.generateAccessToken(largePayload);
      
      expect(result).toBe('large-token');
    });
  });
});