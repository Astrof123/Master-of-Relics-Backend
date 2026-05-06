import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    DeleteDateColumn,
    JoinColumn,
    ManyToOne,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Deck } from './deck.entity';
import { Card } from './card.entity';


@Entity('deck-cards')
export class DeckCard {
    @ApiProperty({ example: 1 })
    @PrimaryGeneratedColumn()
    id!: number;

    @ApiProperty({ type: () => Deck })
    @ManyToOne(() => Deck, (deck) => deck.cards, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'deckId' })
    deck!: Deck;

    @ApiProperty()
    @Column()
    deckId!: number;

    @ApiProperty({ type: () => Card })
    @ManyToOne(() => Card, (card) => card.deck_cards, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'cardId' })
    card!: Card;

    @ApiProperty()
    @Column()
    cardId!: number;

    @ApiProperty()
    @Column()
    position!: number;

    @ApiProperty()
    @CreateDateColumn()
    createdAt!: Date;

    @ApiProperty()
    @DeleteDateColumn()
    @Exclude()
    deletedAt!: Date;
}