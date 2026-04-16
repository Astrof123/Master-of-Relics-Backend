import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { TokenService } from './jwt/token.service';
import { WebSocketAuthMiddleware } from './middlewares/websocket-auth.middleware';
import { CollectionModule } from 'src/collection/collection.module';

@Module({
    controllers: [AuthController],
    providers: [AuthService, TokenService, WebSocketAuthMiddleware],
    imports: [
        TypeOrmModule.forFeature([User]),
        CollectionModule
    ],
    exports: [
        WebSocketAuthMiddleware
    ]
})
export class AuthModule {}
