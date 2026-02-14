import { Module } from '@nestjs/common';
import { SocketConnectionGateway } from './socket-connection.gateway';
import { AuthModule } from 'src/auth/auth.module';
import { WebSocketAuthMiddleware } from 'src/auth/middlewares/websocket-auth.middleware';

@Module({
    providers: [
        SocketConnectionGateway
    ],
    imports: [
        AuthModule
    ]
})
export class SocketConnectionModule {

}
