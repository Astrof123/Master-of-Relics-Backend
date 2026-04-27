import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class FindFriendsDto {
    @ApiProperty({ example: "vasya", description: 'Фильтр никнеймов' })
    @IsString()
    @MaxLength(30)
    searchQuery!: string;
}