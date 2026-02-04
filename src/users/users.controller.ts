import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';
import { plainToInstance } from 'class-transformer';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';


@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get(':id')
    @ApiOperation({ summary: 'Получить пользователя по ID' })
    async findOne(@Param('id', ParseIntPipe) id: number): Promise<UserResponseDto> {
        const user = await this.usersService.findOne(id);

        return plainToInstance(UserResponseDto, user, {
            excludeExtraneousValues: true,
        });
    }
}
