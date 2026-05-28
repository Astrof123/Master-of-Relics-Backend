import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    DeleteDateColumn,
    Index,
    OneToMany,
    JoinColumn,
    ManyToOne,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UserCollection } from './collection.entity';
import { User } from 'src/users/entities/user.entity';
import { DeckCard } from './deck-card.entity';

@Entity('decks')
export class Deck {
    @ApiProperty({ example: 1 })
    @PrimaryGeneratedColumn()
    id!: number;

    @ApiProperty({ type: () => User })
    @ManyToOne(() => User, (user) => user.collections, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'userId' })
    user!: User;

    @ApiProperty()
    @Column()
    userId!: string;

    @ApiProperty({ example: false, description: 'Активна ли колода' })
    @Column()
    isActive!: boolean;

    @ApiProperty()
    @Column()
    indexNumber!: number;

    @ApiProperty()
    @CreateDateColumn()
    createdAt!: Date;

    @ApiProperty()
    @DeleteDateColumn()
    @Exclude()
    deletedAt!: Date;

    @OneToMany(() => DeckCard, (deckCard) => deckCard.deck)
    cards!: DeckCard[];
}
