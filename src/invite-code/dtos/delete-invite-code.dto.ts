import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { INVITE_CODE_STATUS, type InviteCodeStatus } from '../types/invite-code';

export class DeleteInviteCodeDto {
    @ApiProperty({ required: true})
    @IsString()
    @IsNotEmpty()
    inviteCodeId!: string;
}