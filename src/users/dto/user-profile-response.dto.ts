import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import type { Friend, OfferFriendship, Relationship } from '../types/friend';
import type { Stats } from '../types/stats';

export class UserProfileResponseDto {
    @Expose()
    @ApiProperty()
    id!: number;

    @Expose()
    @ApiProperty()
    nickname!: string;

    @Expose()
    @ApiProperty()
    isOnline!: boolean;

    @Expose()
    @ApiProperty()
    relationship!: Relationship;

    @Expose()
    @ApiProperty()
    relationshipInitiator!: number | null;

    @Expose()
    @ApiProperty()
    isReported!: boolean; 

    @Expose()
    @ApiProperty()
    friends!: Friend[];

    @Expose()
    @ApiProperty()
    stats!: Stats;

    @Expose()
    @ApiProperty()
    offersFriendship!: OfferFriendship[] | null; 
}