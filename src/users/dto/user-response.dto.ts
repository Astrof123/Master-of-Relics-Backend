import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class UserResponseDto {
    @Expose()
    @ApiProperty()
    id!: number;

    @Expose()
    @ApiProperty()
    nickname!: string;

    @Expose()
    @ApiProperty()
    gold!: number;
}