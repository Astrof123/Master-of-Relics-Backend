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
import { Transform, Type } from 'class-transformer';
import type { InviteCodeStatus } from '../types/invite-code';

export class GetInviteCodesDto {
    @ApiProperty({ required: false, default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    page?: number = 1;

    @ApiPropertyOptional({ description: 'ID инвайт-кода' })
    @IsOptional()
    @IsString()
    inviteCodeId?: string;

    @ApiProperty({ required: false, default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    limit?: number = 10;

    @ApiPropertyOptional({ description: 'Статус инвайт-кода' })
    @IsOptional()
    @IsString()
    status?: InviteCodeStatus;

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
}
