import { forwardRef, Module } from '@nestjs/common';
import { SocketConnectionGateway } from './socket-connection.gateway';
import { AuthModule } from 'src/auth/auth.module';
import { WebSocketAuthMiddleware } from 'src/auth/middlewares/websocket-auth.middleware';
import { SocketConnectionService } from './socket-connection.service';
import { RedisModule } from 'src/redis/redis.module';

@Module({
    providers: [
        SocketConnectionGateway,
        SocketConnectionService
    ],
    imports: [
        forwardRef(() => AuthModule),
        RedisModule
    ],
    exports: [
        SocketConnectionService
    ]
})
export class SocketConnectionModule {

}
