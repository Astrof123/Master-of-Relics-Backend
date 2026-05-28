import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsNumber,
    IsNotEmpty,
    IsString,
    MinLength,
    MaxLength,
    IsOptional,
    IsInt,
    Min,
    Max,
    IsBoolean,
} from 'class-validator';
import type { ReportType } from '../types/report';
import { Transform, Type } from 'class-transformer';

export class GetUsersDto {
    @ApiProperty({ required: false, default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    page?: number = 1;

    @ApiProperty({ required: false, default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    limit?: number = 10;

    @ApiPropertyOptional({ description: 'ID пользователя' })
    @IsOptional()
    @IsString()
    userId?: string;

    @ApiPropertyOptional({
        description: 'Забанен ли пользователь',
        example: false,
    })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === undefined || value === null || value === '') {
            return undefined;
        }
        if (value === 'true' || value === '1' || value === true) {
            return true;
        }
        if (value === 'false' || value === '0' || value === false) {
            return false;
        }
        return undefined;
    })
    @IsBoolean()
    isBanned?: boolean;

    @ApiPropertyOptional({
        description: 'Админ ли пользователь',
        example: false,
    })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === undefined || value === null || value === '') {
            return undefined;
        }
        if (value === 'true' || value === '1' || value === true) {
            return true;
        }
        if (value === 'false' || value === '0' || value === false) {
            return false;
        }
        return undefined;
    })
    @IsBoolean()
    isAdmin?: boolean;
}
