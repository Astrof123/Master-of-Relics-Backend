import { ApiProperty } from '@nestjs/swagger';
import {
    IsNumber,
    IsNotEmpty,
    IsString,
    MinLength,
    MaxLength,
} from 'class-validator';

export class FindFriendsDto {
    @ApiProperty({ example: '8472187654', description: 'Код дружбы' })
    @IsString()
    @MaxLength(10)
    searchQuery!: string;
}
