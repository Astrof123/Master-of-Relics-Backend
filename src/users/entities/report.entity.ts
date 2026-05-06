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
import type { ReportType } from '../types/report';


@Entity('reports')
export class Report {
    @ApiProperty({ example: 1 })
    @PrimaryGeneratedColumn()
    id!: number;

    @ApiProperty({ example: "Выходит из игр" })
    @Column()
    text!: string;

    @ApiProperty({ example: "Препятствование игре" })
    @Column()
    reportType!: ReportType;    

    @ApiProperty({ example: false })
    @Column({ default: false })
    isProcessed!: boolean;

    @ApiProperty({ type: () => User })
    @ManyToOne(() => User, (user) => user.reports, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'reportedUserId' })
    reportedUser!: User;

    @ApiProperty()
    @Column()
    reportedUserId!: string;

    @ApiProperty({ type: () => User })
    @ManyToOne(() => User, (user) => user.reportsSended, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'requesterUserId' })
    requesterUser!: User;

    @ApiProperty()
    @Column()
    requesterUserId!: string;

    @ApiProperty()
    @CreateDateColumn()
    createdAt!: Date;

    @ApiProperty()
    @DeleteDateColumn()
    @Exclude()
    deletedAt?: Date;
}