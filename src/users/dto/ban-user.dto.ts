import { ApiProperty } from '@nestjs/swagger';
import {
    IsNumber,
    IsNotEmpty,
    IsString,
    MinLength,
    MaxLength,
} from 'class-validator';

export class BanUserDto {
    @ApiProperty({ description: 'ID игрока' })
    @IsString()
    bannedUserId!: string;

    @ApiProperty({
        description: 'Забанен до (ISO format)',
        example: '2024-01-01',
    })
    @IsString()
    @IsNotEmpty()
    bannedUntil!: string;

    @ApiProperty({
        example: 'Никнейм с оскорблением',
        description: 'Текст бана',
    })
    @IsString()
    @MaxLength(255)
    @IsNotEmpty()
    text!: string;
}
