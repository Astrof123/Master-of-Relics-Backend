import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Post,
    Query,
    Req,
    UseGuards,
    ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';
import { plainToInstance } from 'class-transformer';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type AuthenticatedRequest from 'src/shared/types/authenticated-request';
import { UserProfileResponseDto } from './dto/user-profile-response.dto';
import { FindFriendsDto } from './dto/find-friends.dto';
import { ReportUserDto } from './dto/report-user.dto';
import { GetReportsDto } from './dto/get-reports.dto';
import { ReportResponseDto } from './dto/report-response.dto';
import { GetReportsResponseDto } from './dto/get-reports-response.dto';
import { BanUserDto } from './dto/ban-user.dto';
import { UnbanUserDto } from './dto/unban-user.dto';
import { SetAdminDto } from './dto/set-admin.dto';
import { GetUsersDto } from './dto/users.dto';
import { GetUsersResponseDto } from './dto/get-users-response.dto';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get()
    @ApiOperation({ summary: 'Получить всех игроков (с пагинацией)' })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    async getAllUsers(
        @Req() request: AuthenticatedRequest,
        @Query(ValidationPipe) data: GetUsersDto,
    ): Promise<GetUsersResponseDto> {
        const users = await this.usersService.getAllUsers(data);

        const resultDto: GetUsersResponseDto = {
            ...users,
            data: users.data.map((user) =>
                plainToInstance(UserResponseDto, user, {
                    excludeExtraneousValues: true,
                }),
            ),
        };

        return resultDto;
    }

    @Post('admins')
    @ApiOperation({ summary: 'Назначить админа' })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    @HttpCode(HttpStatus.OK)
    async setAdmin(
        @Req() request: AuthenticatedRequest,
        @Body(ValidationPipe) setAdminDto: SetAdminDto,
    ) {
        const userId = request.user.userId;
        await this.usersService.setAdmin(setAdminDto);
    }

    @Get('reports')
    @ApiOperation({ summary: 'Получить все жалобы (с пагинацией)' })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    async getReports(
        @Req() request: AuthenticatedRequest,
        @Query(ValidationPipe) getReportsDto: GetReportsDto,
    ) {
        const result = await this.usersService.getReports(getReportsDto);
        const resultDto: GetReportsResponseDto = {
            ...result,
            data: result.data.map((report) =>
                plainToInstance(ReportResponseDto, report, {
                    excludeExtraneousValues: true,
                }),
            ),
        };

        return resultDto;
    }

    @Get('me')
    @ApiOperation({ summary: 'Получить свои данные по accessToken' })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    async me(@Req() request: AuthenticatedRequest): Promise<UserResponseDto> {
        const userId = request.user.userId;
        const user = await this.usersService.findOne(userId);

        return plainToInstance(UserResponseDto, user, {
            excludeExtraneousValues: true,
        });
    }

    @Get('profile/:id')
    @ApiOperation({ summary: 'Получить профиль пользователя по ID' })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    async getProfile(
        @Req() request: AuthenticatedRequest,
        @Param('id') id: string,
    ): Promise<UserProfileResponseDto> {
        const userId = request.user.userId;
        const profile = await this.usersService.profile(id, userId);

        return profile;
    }

    @Post('friendships')
    @ApiOperation({ summary: 'Получить всех пользователей для дружбы' })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    async findAllForFriends(
        @Req() request: AuthenticatedRequest,
        @Body(ValidationPipe) findFriendsDto: FindFriendsDto,
    ): Promise<UserResponseDto[]> {
        const userId = request.user.userId;
        const users = await this.usersService.findFriends(
            findFriendsDto,
            userId,
        );

        const result = users.map((user) => {
            return plainToInstance(UserResponseDto, user, {
                excludeExtraneousValues: true,
            });
        });

        return result;
    }

    @Post('friendships/offer/:id')
    @ApiOperation({ summary: 'Предложить дружбу' })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    @HttpCode(HttpStatus.CREATED)
    async offerFriendship(
        @Req() request: AuthenticatedRequest,
        @Param('id') id: string,
    ) {
        const userId = request.user.userId;
        await this.usersService.offerFriendship(id, userId);
    }

    @Post('friendships/accept/:id')
    @ApiOperation({ summary: 'Принять дружбу' })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    @HttpCode(HttpStatus.OK)
    async acceptFriendship(
        @Req() request: AuthenticatedRequest,
        @Param('id') id: string,
    ) {
        const userId = request.user.userId;
        await this.usersService.acceptFriendship(id, userId);
    }

    @Post('friendships/decline/:id')
    @ApiOperation({ summary: 'Отклонить дружбу' })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    @HttpCode(HttpStatus.OK)
    async declineFriendship(
        @Req() request: AuthenticatedRequest,
        @Param('id') id: string,
    ) {
        const userId = request.user.userId;
        await this.usersService.breakoffFriendship(id, userId);
    }

    @Post('friendships/breakoff/:id')
    @ApiOperation({ summary: 'Разорвать дружбу' })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    @HttpCode(HttpStatus.OK)
    async breakoffFriendship(
        @Req() request: AuthenticatedRequest,
        @Param('id') id: string,
    ) {
        const userId = request.user.userId;
        await this.usersService.breakoffFriendship(id, userId);
    }

    @Post('reports')
    @ApiOperation({ summary: 'Отправить жалобу на игрока' })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    async reportPlayer(
        @Req() request: AuthenticatedRequest,
        @Body(ValidationPipe) reportUserDto: ReportUserDto,
    ) {
        const userId = request.user.userId;
        await this.usersService.reportUser(reportUserDto, userId);
    }

    @Post('ban')
    @ApiOperation({ summary: 'Забанить игрока' })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    async banPlayer(@Body(ValidationPipe) banUserDto: BanUserDto) {
        await this.usersService.banUser(banUserDto);
    }

    @Post('unban')
    @ApiOperation({ summary: 'Разбанить игрока' })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    async unbanPlayer(@Body(ValidationPipe) unbanUserDto: UnbanUserDto) {
        await this.usersService.unbanUser(unbanUserDto);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Получить пользователя по ID' })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    async findUserById(@Param('id') id: string): Promise<UserResponseDto> {
        const user = await this.usersService.findOne(id);

        return plainToInstance(UserResponseDto, user, {
            excludeExtraneousValues: true,
        });
    }
}
