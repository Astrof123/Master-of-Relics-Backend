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
    isString,
} from 'class-validator';
import type { ReportType } from '../types/report';
import { Transform, Type } from 'class-transformer';

export class GetReportsDto {
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

    @ApiPropertyOptional({
        description: 'ID пользователя, на которого пожаловались',
    })
    @IsOptional()
    @IsString()
    reportedUserId?: string;

    @ApiPropertyOptional({
        description: 'Начальная дата (ISO format)',
        example: '2024-01-01',
    })
    @IsOptional()
    @IsString()
    startDate?: string;

    @ApiPropertyOptional({
        description: 'Конечная дата (ISO format)',
        example: '2024-12-31',
    })
    @IsOptional()
    @IsString()
    endDate?: string;

    @ApiPropertyOptional({
        description: 'Обработана ли жалоба',
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
    isProcessed?: boolean;
}
