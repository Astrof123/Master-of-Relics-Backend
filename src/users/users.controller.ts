import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';
import { plainToInstance } from 'class-transformer';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type AuthenticatedRequest from 'src/shared/types/authenticated-request';
import { UserProfileResponseDto } from './dto/user-profile-response.dto';
import { FindFriendsDto } from './dto/find-friends.dto';


@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

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
    async getProfile(@Req() request: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number): Promise<UserProfileResponseDto> {
        const userId = request.user.userId;
        const profile = await this.usersService.profile(id, userId);

        return profile;
    }

    @Get(':id')
    @ApiOperation({ summary: 'Получить пользователя по ID' })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    async findUserById(@Param('id', ParseIntPipe) id: number): Promise<UserResponseDto> {
        const user = await this.usersService.findOne(id);

        return plainToInstance(UserResponseDto, user, {
            excludeExtraneousValues: true,
        });
    }

    @Post("friendship")
    @ApiOperation({ summary: 'Получить всех пользователей для дружбы' })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    async findAllForFriends(@Req() request: AuthenticatedRequest, @Body() findFriendsDto: FindFriendsDto): Promise<UserResponseDto[]> {
        const userId = request.user.userId;
        const users = await this.usersService.findFriends(findFriendsDto, userId);

        const result = users.map(user => {
            return (
                plainToInstance(UserResponseDto, user, {
                    excludeExtraneousValues: true,
                })
            )
        })

        return result;
    }

    @Post('friendship/offer/:id')
    @ApiOperation({ summary: 'Предложить дружбу' })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    @HttpCode(HttpStatus.CREATED)
    async offerFriendship(@Req() request: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
        const userId = request.user.userId;
        await this.usersService.offerFriendship(id, userId);
    }

    @Post('friendship/accept/:id')
    @ApiOperation({ summary: 'Принять дружбу' })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    @HttpCode(HttpStatus.OK)
    async acceptFriendship(@Req() request: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
        const userId = request.user.userId;
        await this.usersService.acceptFriendship(id, userId);
    }

    @Post('friendship/decline/:id')
    @ApiOperation({ summary: 'Отклонить дружбу' })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    @HttpCode(HttpStatus.OK)
    async declineFriendship(@Req() request: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
        const userId = request.user.userId;
        await this.usersService.breakoffFriendship(id, userId);
    }

    @Post('friendship/breakoff/:id')
    @ApiOperation({ summary: 'Разорвать дружбу' })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    @HttpCode(HttpStatus.OK)
    async breakoffFriendship(@Req() request: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
        const userId = request.user.userId;
        await this.usersService.breakoffFriendship(id, userId);
    }
}
