import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    DeleteDateColumn,
    Index,
    OneToMany,
    OneToOne,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UserCollection } from 'src/collection/entities/collection.entity';
import { UserStats } from './user-stats.entity';
import { FriendRelationShip } from './friend-relationship.entity';

@Entity('users')
export class User {
    @ApiProperty({ example: 1 })
    @PrimaryGeneratedColumn()
    id!: number;

    @ApiProperty({ example: 'vasya_228', minLength: 4, maxLength: 30 })
    @Column({ length: 30 })
    nickname!: string;

    @ApiProperty({ example: 'john_doe', minLength: 4, maxLength: 30 })
    @Column({ unique: true, length: 30})
    @Index()
    login!: string;

    @Exclude()
    @Column()
    password!: string;

    @Exclude()
    @ApiProperty({ example: 'Запрещенный ник' })
    @Column({ nullable: true })
    banReason!: string;

    @Exclude() 
    @ApiProperty()
    @Column({ nullable: true })
    bannedAt!: Date;

    @ApiProperty()
    @CreateDateColumn()
    createdAt!: Date;

    @ApiProperty()
    @DeleteDateColumn()
    @Exclude()
    deletedAt!: Date;

    @ApiProperty({ example: false })
    @Column({ default: false })
    @Exclude()
    isAdmin!: boolean;

    @ApiProperty()
    @Column({ default: 0 })
    gold!: number;

    @OneToMany(() => UserCollection, (userCollection) => userCollection.user)
    collections!: UserCollection[];

    @OneToOne(() => UserStats, (stats) => stats.user)
    stats!: UserStats;

    @OneToMany(() => FriendRelationShip, (relation) => relation.requester)
    requester!: FriendRelationShip[];

    @OneToMany(() => FriendRelationShip, (relation) => relation.addressee)
    addressee!: FriendRelationShip[];
}