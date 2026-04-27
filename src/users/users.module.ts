import { forwardRef, Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserStats } from './entities/user-stats.entity';
import { FriendRelationShip } from './entities/friend-relationship.entity';
import { SocketConnectionModule } from 'src/socket-connection/socket-connection.module';
import { UsersStatsService } from './users-stats.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([User]),
        TypeOrmModule.forFeature([UserStats]),
        TypeOrmModule.forFeature([FriendRelationShip]),
        forwardRef(() => SocketConnectionModule),
    ],
    controllers: [UsersController],
    providers: [UsersService, UsersStatsService],
    exports: [
        UsersService,
        UsersStatsService
    ]
})
export class UsersModule {}
