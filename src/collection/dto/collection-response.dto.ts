import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CardResponseDto } from './card-response.dto';

export class CollectionResponseDto {
    @Expose()
    @ApiProperty()
    @Type(() => CardResponseDto)
    cards!: CardResponseDto[];
}