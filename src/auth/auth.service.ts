import { ConflictException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { TokenService } from './jwt/token.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { TokensDto } from './dto/tokens.dto';
import { LoginDto } from './dto/login.dto';
import { InvalidCredentialsException, UserAlreadyExistsException } from './exceptions/auth.exception';
import { CustomHttpException } from 'src/common/custom-http.exception';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        private tokenService: TokenService,
    ) {}


    async register(registerDto: RegisterDto): Promise<TokensDto> {
        const { nickname, login, password } = registerDto;

        try {
            const existingUser = await this.usersRepository.findOne({ 
                where: { login } 
            });
            
            if (existingUser) {
                throw new UserAlreadyExistsException();
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const user = this.usersRepository.create({
                nickname,
                login,
                password: hashedPassword,
            });

            await this.usersRepository.save(user);

            const tokens = await this.tokenService.generateTokens({
                sub: user.id
            });

            return {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken
            };
        }
        catch (error) {
            if (error instanceof CustomHttpException) {
                throw error;
            }
            
            console.error('Registration error:', error);
            throw new HttpException(
                'Ошибка при регистрации пользователя',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async login(loginDto: LoginDto): Promise<TokensDto> {
        const { login, password } = loginDto;

        try {
            const user = await this.usersRepository.findOne({ 
                where: { login } 
            });
            
            if (!user) {
                throw new InvalidCredentialsException();
            }

            const isPasswordValid = await bcrypt.compare(password, user.password);
            
            if (!isPasswordValid) {
                throw new InvalidCredentialsException();
            }

            const tokens = await this.tokenService.generateTokens({
                sub: user.id
            });

            return {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            };
        }
        catch (error) {
            if (error instanceof CustomHttpException) {
                throw error;
            }
            
            console.error('Login error:', error);
            throw new HttpException(
                'Ошибка на стороне сервера',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }


    async refreshTokens(refreshToken: string) {
        try {
            const payload = await this.tokenService.verifyRefreshToken(refreshToken);
            
            if (!payload) {
                throw new UnauthorizedException('Невалидный refresh token');
            }

            const user = await this.usersRepository.findOne({ 
                where: { id: payload.sub } 
            });
            
            if (!user) {
                throw new UnauthorizedException('Пользователь не найден');
            }

            const tokens = await this.tokenService.generateTokens({
                sub: user.id
            });

            return {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            };
        }
        catch (error) {
            if (error instanceof CustomHttpException) {
                throw error;
            }
            
            console.error('Refresh token error:', error);
            throw new HttpException(
                'Ошибка на стороне сервера',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}

