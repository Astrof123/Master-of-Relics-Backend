import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    DeleteDateColumn,
    Index,
    OneToMany,
    ManyToOne,
    JoinColumn,
    OneToOne,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { User } from 'src/users/entities/user.entity';
import { INVITE_CODE_STATUS, type InviteCodeStatus } from '../types/invite-code';


@Entity('invite-codes')
export class InviteCode {
    @ApiProperty()
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ApiProperty({ type: () => User })
    @ManyToOne(() => User, (user) => user.inviteCode, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'userId' })
    user?: User;

    @ApiProperty()
    @Column({ nullable: true })
    userId?: string;

    @ApiProperty({ example: INVITE_CODE_STATUS.FREE, default: INVITE_CODE_STATUS.FREE })
    @Column()
    status!: InviteCodeStatus;

    @ApiProperty()
    @Column({ nullable: true })
    usedAt?: Date;

    @ApiProperty()
    @CreateDateColumn()
    createdAt!: Date;

    @ApiProperty()
    @DeleteDateColumn()
    @Exclude()
    deletedAt?: Date;
}