import { ApiProperty } from '@nestjs/swagger';
import {
    IsNumber,
    IsNotEmpty,
    IsString,
    MinLength,
    MaxLength,
    IsBoolean,
} from 'class-validator';

export class SetAdminDto {
    @ApiProperty({ description: 'ID игрока' })
    @IsString()
    userId!: string;

    @ApiProperty({ description: 'Админ или нет' })
    @IsBoolean()
    @IsNotEmpty()
    isAdmin!: boolean;
}
