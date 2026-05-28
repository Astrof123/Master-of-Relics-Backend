import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsNotEmpty, IsNumber } from 'class-validator';
import type { ArtifactType } from 'src/artifact/types/artifact';

export class ChangeActiveDeckDto {
    @ApiProperty({ example: 1, description: 'ID колоды' })
    @IsNumber()
    @IsNotEmpty()
    deckId!: number;
}
