import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, IsString, MinLength, MaxLength, IsOptional, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import type { InviteCodeStatus } from '../types/invite-code';

export class CreateInviteCodesDto {
    @ApiProperty({ required: true, default: 5 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(10)
    count: number = 5;
}