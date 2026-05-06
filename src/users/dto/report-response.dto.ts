import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { User } from '../entities/user.entity';
import { UserResponseDto } from './user-response.dto';

export class ReportResponseDto {
    @Expose()
    @ApiProperty()
    id!: number;

    @Expose()
    @ApiProperty()
    text!: string;

    @Expose()
    @ApiProperty()
    reportType!: string;

    @Expose()
    @ApiProperty()
    isProcessed!: boolean;

    @Expose()
    @ApiProperty()
    reportedUserId!: string;

    @Expose()
    @ApiProperty({ type: () => UserResponseDto })
    @Type(() => UserResponseDto)
    reportedUser!: UserResponseDto;

    @Expose()
    @ApiProperty()
    requesterUserId!: string;

    @Expose()
    @ApiProperty({ type: () => UserResponseDto })
    @Type(() => UserResponseDto)
    requesterUser!: UserResponseDto;

    @Expose()
    @ApiProperty()
    createdAt!: Date;
}