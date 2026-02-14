import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';
import { plainToInstance } from 'class-transformer';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type AuthenticatedRequest from 'src/shared/types/authenticated-request';


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
}
