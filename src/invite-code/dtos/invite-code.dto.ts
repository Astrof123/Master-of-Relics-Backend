import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import type { InviteCodeStatus } from '../types/invite-code';
import { UserResponseDto } from 'src/users/dto/user-response.dto';

export class InviteCodeDto {
    @Expose()
    @ApiProperty()
    id!: string;

    @Expose()
    @ApiProperty({ type: () => UserResponseDto })
    @Type(() => UserResponseDto)
    user!: UserResponseDto;

    @Expose()
    @ApiProperty()
    userId!: string;

    @Expose()
    @ApiProperty()
    status!: InviteCodeStatus;

    @Expose()
    @ApiProperty()
    usedAt!: Date;

    @Expose()
    @ApiProperty()
    createdAt!: Date;
}
