import { ConflictException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { TokenService } from './jwt/token.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { TokensDto } from './dto/tokens.dto';
import { LoginDto } from './dto/login.dto';
import { InvalidCredentialsException, InvalidInviteCodeException, UsedInviteCodeException, UserAlreadyExistsException } from './exceptions/auth.exception';
import { CustomHttpException } from 'src/common/custom-http.exception';
import { CollectionService } from 'src/collection/collection.service';
import { UserStats } from 'src/users/entities/user-stats.entity';
import { InviteCode } from 'src/invite-code/entities/invite-code.entity';
import { INVITE_CODE_STATUS } from 'src/invite-code/types/invite-code';
import { validate as isValidUUID } from 'uuid';
import { DeckService } from 'src/collection/deck.service';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        @InjectRepository(UserStats)
        private userStatsRepository: Repository<UserStats>,
        @InjectRepository(InviteCode)
        private inviteCodeRepository: Repository<InviteCode>,
        private tokenService: TokenService,
        private collectionService: CollectionService,
        private readonly deckService: DeckService
    ) {}

    private generateFriendCode(): string {
        const num = Math.floor(Math.random() * 10000000000);
        return num.toString().padStart(10, '0');
    }

    async register(registerDto: RegisterDto): Promise<TokensDto> {
        const { nickname, login, password } = registerDto;

        try {
            const existingUser = await this.usersRepository.findOne({ 
                where: { login } 
            });

            if (existingUser) {
                throw new UserAlreadyExistsException();
            }

            if (!isValidUUID(registerDto.inviteCode)) {
                throw new InvalidInviteCodeException();
            }

            const inviteCode = await this.inviteCodeRepository.findOne({ 
                where: { id: registerDto.inviteCode } 
            });
            
            if (!inviteCode) {
                throw new InvalidInviteCodeException();
            }

            if (inviteCode.userId) {
                throw new UsedInviteCodeException();
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            let exists = true;
            let code: string = "4235235233";

            while (exists) {
                code = this.generateFriendCode();
                exists = await this.usersRepository.exists({ where: { friendCode: code } });
            }

            const user = this.usersRepository.create({
                nickname,
                login,
                password: hashedPassword,
                friendCode: code
            });
            await this.usersRepository.save(user);

            const userStats = this.userStatsRepository.create({
                userId: user.id
            });
            await this.userStatsRepository.save(userStats);

            inviteCode.userId = user.id;
            inviteCode.usedAt = new Date();
            inviteCode.status = INVITE_CODE_STATUS.USED;
            await this.inviteCodeRepository.save(inviteCode);

            await this.collectionService.createForNewUser(user.id);
            await this.deckService.createForNewUser(user.id);

            const tokens = await this.tokenService.generateTokens({
                sub: user.id
            });

            return {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken
            };
        }
        catch (error) {
            if (error instanceof UserAlreadyExistsException ||
                error instanceof InvalidInviteCodeException ||
                error instanceof UsedInviteCodeException ||
                error instanceof CustomHttpException) {
                throw error;
            }
            
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
            if (error instanceof InvalidCredentialsException ||
                error instanceof CustomHttpException) {
                throw error;
            }

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
            if (error instanceof UnauthorizedException ||
                error instanceof CustomHttpException) {
                throw error;
            }
            
            throw new HttpException(
                'Ошибка на стороне сервера',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}