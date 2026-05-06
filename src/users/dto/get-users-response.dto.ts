import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { User } from '../entities/user.entity';
import { UserResponseDto } from './user-response.dto';
import { ReportResponseDto } from './report-response.dto';

export class GetUsersResponseDto {
    @Expose()
    @ApiProperty()
    data!: UserResponseDto[];

    @Expose()
    @ApiProperty()
    total!: number;

    @Expose()
    @ApiProperty()
    page!: number;

    @Expose()
    @ApiProperty()
    limit!: number;

    @Expose()
    @ApiProperty()
    totalPages!: number;
}