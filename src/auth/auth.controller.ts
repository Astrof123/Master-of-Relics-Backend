import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { TokenService } from './jwt/token.service';
import { RegisterDto } from './dto/register.dto';
import { TokensDto } from './dto/tokens.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import express from 'express';
import { ApiBearerAuth } from '@nestjs/swagger';


@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly tokenService: TokenService,
    ) {}    

    private setRefreshTokenCookie(response: express.Response, refreshToken: string) {
        response.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });
    }

    @Post('register')
    async register(
        @Body() registerDto: RegisterDto,
        @Res({ passthrough: true }) response: express.Response,
    ): Promise<Omit<TokensDto, 'refreshToken'>> {
        const result = await this.authService.register(registerDto);
        this.setRefreshTokenCookie(response, result.refreshToken);

        return {
            accessToken: result.accessToken,
        };
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(
        @Body() loginDto: LoginDto,
        @Res({ passthrough: true }) response: express.Response,
    ): Promise<Omit<TokensDto, 'refreshToken'>> {
        const result = await this.authService.login(loginDto);

        this.setRefreshTokenCookie(response, result.refreshToken);

        return {
            accessToken: result.accessToken,
        };
    }

    @Get('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(
        @Req() request: express.Request,
        @Res({ passthrough: true }) response: express.Response,
    ): Promise<{ accessToken: string }> {
        const refreshToken = request.cookies?.refresh_token;
        
        if (!refreshToken) {
            throw new UnauthorizedException('Токен не найден');
        }

        const tokens = await this.authService.refreshTokens(refreshToken);

        this.setRefreshTokenCookie(response, tokens.refreshToken);

        return { accessToken: tokens.accessToken };
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    async logout(
        @Res({ passthrough: true }) response: express.Response,
    ): Promise<void> {
        response.clearCookie('refresh_token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        });

        return;
    }
}
