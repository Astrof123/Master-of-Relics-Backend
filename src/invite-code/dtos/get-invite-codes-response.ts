import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { InviteCodeDto } from './invite-code.dto';

export class GetInviteCodesResponseDto {
    @Expose()
    @ApiProperty()
    data!: InviteCodeDto[];

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
