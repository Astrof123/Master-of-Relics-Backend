import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';
import type { ReportType } from '../types/report';

export class ReportUserDto {
    @ApiProperty({ description: 'ID игрока' })
    @IsString()
    reportedUserId!: string;

    @ApiProperty({ example: "Препятствование игре", description: 'Тип жалобы' })
    @IsString()
    @MaxLength(55)
    @IsNotEmpty()
    reportType!: ReportType;

    @ApiProperty({ example: "Никнейм с оскорблением", description: 'Текст жалобы' })
    @IsString()
    @MaxLength(255)
    @IsNotEmpty()
    text!: string;
}