import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CardResponseDto } from './card-response.dto';
import { DeckResponseDto } from './deck-response.dto';

export class GetDecksResponseDto {
    @Expose()
    @ApiProperty()
    @Type(() => DeckResponseDto)
    decks!: DeckResponseDto[];
}