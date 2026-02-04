import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class TokenService {
    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService
    ) {}

    async generateAccessToken(payload: any): Promise<string> {
        return this.jwtService.signAsync(payload, {
            secret: this.configService.get('jwt.accessSecret'),
            expiresIn: this.configService.get('jwt.accessExpiresIn'),
        });
    }

    async generateRefreshToken(payload: any): Promise<string> {
        return this.jwtService.signAsync(payload, {
            secret: this.configService.get('jwt.refreshSecret'),
            expiresIn: this.configService.get('jwt.refreshExpiresIn'),
        });
    }

    async generateTokens(payload: any) {
        const [accessToken, refreshToken] = await Promise.all([
            this.generateAccessToken(payload),
            this.generateRefreshToken(payload),
        ]);

        return {
            accessToken,
            refreshToken,
        };
    }

    async verifyAccessToken(token: string): Promise<any> {
        try {
            return await this.jwtService.verifyAsync(token, {
                secret: this.configService.get('jwt.accessSecret'),
            });
        } catch (error) {
            return null;
        }
    }

    async verifyRefreshToken(token: string): Promise<any> {
        try {
            return await this.jwtService.verifyAsync(token, {
                secret: this.configService.get('jwt.refreshSecret'),
            });
        } catch (error) {
            return null;
        }
    }

    decodeToken(token: string): any {
        return this.jwtService.decode(token);
    }
}