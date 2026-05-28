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
import { Report } from './report.entity';
import { InviteCode } from 'src/invite-code/entities/invite-code.entity';
import { Deck } from 'src/collection/entities/deck.entity';

@Entity('users')
export class User {
    @ApiProperty({ example: 1 })
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ApiProperty({ example: 'vasya_228', minLength: 4, maxLength: 30 })
    @Column({ length: 30 })
    nickname!: string;

    @ApiProperty({ example: 'john_doe', minLength: 4, maxLength: 30 })
    @Column({ unique: true, length: 30 })
    @Index()
    login!: string;

    @ApiProperty({ example: '0421484233', minLength: 10, maxLength: 10 })
    @Column({ unique: true, length: 10 })
    friendCode!: string;

    @Exclude()
    @Column()
    password!: string;

    @Exclude()
    @ApiProperty({ example: 'Запрещенный ник' })
    @Column({ nullable: true, type: 'text' })
    banReason: string | null = null;

    @Exclude()
    @ApiProperty()
    @Column({ nullable: true, type: 'timestamp' })
    bannedUntil: Date | null = null;

    @ApiProperty()
    @CreateDateColumn()
    createdAt!: Date;

    @ApiProperty()
    @DeleteDateColumn()
    @Exclude()
    deletedAt?: Date;

    @ApiProperty({ example: false })
    @Column({ default: false })
    isAdmin!: boolean;

    @ApiProperty({ example: false })
    @Column({ default: false })
    isSuperAdmin!: boolean;

    @ApiProperty()
    @Column({ default: 0 })
    gold!: number;

    @OneToMany(() => UserCollection, (userCollection) => userCollection.user)
    collections!: UserCollection[];

    @OneToMany(() => Deck, (deck) => deck.user)
    decks!: Deck[];

    @OneToMany(() => Report, (report) => report.reportedUser)
    reports!: Report[];

    @OneToMany(() => Report, (report) => report.requesterUser)
    reportsSended!: Report[];

    @OneToOne(() => InviteCode, (report) => report.user)
    inviteCode!: InviteCode;

    @OneToOne(() => UserStats, (stats) => stats.user)
    stats!: UserStats;

    @OneToMany(() => FriendRelationShip, (relation) => relation.requester)
    requester!: FriendRelationShip[];

    @OneToMany(() => FriendRelationShip, (relation) => relation.addressee)
    addressee!: FriendRelationShip[];
}
