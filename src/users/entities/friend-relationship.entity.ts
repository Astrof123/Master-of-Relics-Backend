import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    DeleteDateColumn,
    OneToMany,
    ManyToOne,
    JoinColumn,
    OneToOne,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.entity';
import type { Relationship } from '../types/friend';


@Entity('friend_relationships')
export class FriendRelationShip {
    @ApiProperty({ example: 1 })
    @PrimaryGeneratedColumn()
    id!: number;

    @ApiProperty({ type: () => User })
    @ManyToOne(() => User, (user) => user.requester, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'requesterId' })
    requester!: User;

    @ApiProperty({ example: 1 })
    @Column()
    requesterId!: number;

    @ApiProperty({ type: () => User })
    @ManyToOne(() => User, (user) => user.addressee, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'addresseeId' })
    addressee!: User;

    @ApiProperty({ example: 1 })
    @Column()
    addresseeId!: number;

    @ApiProperty({ example: "friend" })
    @Column()
    status!: Relationship;

    @ApiProperty()
    @CreateDateColumn()
    createdAt!: Date;

    @ApiProperty()
    @DeleteDateColumn()
    @Exclude()
    deletedAt!: Date;
}