import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
    constructor(private readonly configService: ConfigService) {
        const refreshSecret = configService.get<string>('jwt.refreshSecret');
        if (!refreshSecret) {
            throw new Error('JWT refresh secret is not configured');
        }

        super({
            jwtFromRequest: (req: Request) => {
                if (!req.cookies) return null;
                return req.cookies.refresh_token;
            },
            ignoreExpiration: false,
            secretOrKey: refreshSecret,
            passReqToCallback: true,
        });
    }

    async validate(req: Request, payload: any) {
        return {
            userId: payload.sub,
            refreshToken: req.cookies?.refresh_token,
        };
    }
}