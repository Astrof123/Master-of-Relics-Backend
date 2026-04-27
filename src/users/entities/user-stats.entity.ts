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
import { User } from './user.entity';


@Entity('users_stats')
export class UserStats {
    @ApiProperty({ example: 1 })
    @PrimaryGeneratedColumn()
    id!: number;

    @ApiProperty({ example: 98 })
    @Column({ default: 0 })
    totalGames!: number;

    @ApiProperty({ example: 98 })
    @Column({ default: 0 })
    wins!: number;

    @ApiProperty({ example: 98 })
    @Column({ default: 0 })
    winSeries!: number;

    @ApiProperty({ type: () => User })
    @OneToOne(() => User, (user) => user.stats, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'userId' })
    user!: User;

    @ApiProperty({ example: 1 })
    @Column()
    userId!: number;
}