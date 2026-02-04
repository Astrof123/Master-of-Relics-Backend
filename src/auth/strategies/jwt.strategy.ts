import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly configService: ConfigService) {
        const accessSecret = configService.get<string>('jwt.accessSecret');
        if (!accessSecret) {
            throw new Error('JWT access secret is not configured');
        }

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: accessSecret,
        });
    }

    async validate(payload: any) {
        return {
            userId: payload.sub
        };
    }
}