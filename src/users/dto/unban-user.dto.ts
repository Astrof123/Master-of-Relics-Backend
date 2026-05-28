import { ApiProperty } from '@nestjs/swagger';
import {
    IsNumber,
    IsNotEmpty,
    IsString,
    MinLength,
    MaxLength,
} from 'class-validator';

export class UnbanUserDto {
    @ApiProperty({ description: 'ID игрока' })
    @IsString()
    bannedUserId!: string;
}
