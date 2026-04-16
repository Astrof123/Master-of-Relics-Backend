import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    DeleteDateColumn,
    Index,
    OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UserCollection } from './collection.entity';


@Entity('cards')
export class Card {
    @ApiProperty({ example: 1 })
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    @ApiProperty({ example: 100 })
    price!: number;

    @ApiProperty({ example: false, description: 'Выставлена на продажу' })
    @Column({ default: false })
    isForSale!: boolean;

    @ApiProperty({ example: 'intimidator', minLength: 2, maxLength: 30 })
    @Column({ length: 30 })
    innerCardId!: string;

    @ApiProperty()
    @CreateDateColumn()
    createdAt!: Date;

    @ApiProperty()
    @DeleteDateColumn()
    @Exclude()
    deletedAt!: Date;

    @OneToMany(() => UserCollection, (userCollection) => userCollection.card)
    collections!: UserCollection[];
}