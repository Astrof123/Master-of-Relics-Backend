import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class UserResponseDto {
    @Expose()
    @ApiProperty()
    id!: string;

    @Expose()
    @ApiProperty()
    nickname!: string;

    @Expose()
    @ApiProperty()
    gold!: number;

    @Expose()
    @ApiProperty()
    isAdmin!: boolean;

    @Expose()
    @ApiProperty()
    friendCode!: boolean;

    @Expose()
    @ApiProperty()
    isSuperAdmin!: boolean;

    @Expose()
    @ApiProperty()
    bannedUntil!: Date | null;

    @Expose()
    @ApiProperty()
    banReason!: string | null;
}