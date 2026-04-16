import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class CardResponseDto {
    @Expose()
    @ApiProperty()
    id!: number;

    @Expose()
    @ApiProperty()
    innerCardId!: string;

    @Expose()
    @ApiProperty()
    price!: number;

    @Expose()
    @ApiProperty()
    isForSale!: boolean;

    @Expose()
    @ApiProperty()
    hasCard!: boolean;

    @Expose()
    @ApiProperty()
    maxHp!: number;

    @Expose()
    @ApiProperty()
    skillCost!: number | null;
}