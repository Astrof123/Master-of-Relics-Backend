import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty } from 'class-validator';

export class BuyCardDto {
    @ApiProperty({ example: 1, description: 'ID карты для покупки' })
    @IsNumber()
    @IsNotEmpty()
    cardId!: number;
}