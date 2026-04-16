import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    DeleteDateColumn,
    Index,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { User } from 'src/users/entities/user.entity';
import { Card } from './card.entity';


@Entity('user_collections')
export class UserCollection {
    @ApiProperty({ example: 1 })
    @PrimaryGeneratedColumn()
    id!: number;

    @ApiProperty({ type: () => User })
    @ManyToOne(() => User, (user) => user.collections, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'userId' })
    user!: User;

    @ApiProperty({ example: 1 })
    @Column()
    userId!: number;

    @ApiProperty({ type: () => Card })
    @ManyToOne(() => Card, (card) => card.collections, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'cardId' })
    card!: Card;

    @ApiProperty({ example: 1 })
    @Column()
    cardId!: number;

    @ApiProperty()
    @CreateDateColumn()
    createdAt!: Date;
}