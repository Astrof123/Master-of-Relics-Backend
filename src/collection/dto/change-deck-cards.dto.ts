import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsNotEmpty, IsNumber } from 'class-validator';
import type { ArtifactType } from 'src/artifact/types/artifact';

export class ChangeDeckCardsDto {
    @ApiProperty({ example: 1, description: 'ID колоды' })
    @IsNumber()
    @IsNotEmpty()
    deckId!: number;

    @ApiProperty({ description: 'Данные о картах' })
    @IsNotEmpty()
    cards!: CardPosition[];
}

export class CardPosition {
    @ApiProperty({ example: 1, description: 'ID карты' })
    @IsNumber()
    @IsNotEmpty()
    cardId!: number;

    @ApiProperty({ example: 1, description: 'Позиция карты в колоде' })
    @IsNumber()
    @IsNotEmpty()
    position!: number;
}
