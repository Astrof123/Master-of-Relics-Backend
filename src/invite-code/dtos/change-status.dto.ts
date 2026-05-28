import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import {
    INVITE_CODE_STATUS,
    type InviteCodeStatus,
} from '../types/invite-code';

export class ChangeStatusDto {
    @ApiProperty({ required: true })
    @IsString()
    @IsNotEmpty()
    inviteCodeId!: string;

    @ApiProperty({ required: true, example: INVITE_CODE_STATUS.BOOKED })
    @IsString()
    @IsNotEmpty()
    newStatus!: InviteCodeStatus;
}
