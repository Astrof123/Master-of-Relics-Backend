import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import type { ArtifactType } from 'src/artifact/types/artifact';
import { CardResponseDto } from './card-response.dto';

export class DeckResponseDto {
    @Expose()
    @ApiProperty()
    id!: number;

    @Expose()
    @ApiProperty()
    @Type(() => CardResponseDto)
    cards!: CardResponseDto[];

    @Expose()
    @ApiProperty()
    indexNumber!: number;

    @Expose()
    @ApiProperty()
    isActive!: boolean;
}
