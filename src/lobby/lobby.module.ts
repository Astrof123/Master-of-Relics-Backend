import { forwardRef, Module } from '@nestjs/common';
import { LobbyGateway } from './lobby.gateway';
import { LobbyService } from './lobby.service';
import { UsersModule } from 'src/users/users.module';
import { GameStateModule } from 'src/game-state/game-state.module';
import { SocketConnectionModule } from 'src/socket-connection/socket-connection.module';

@Module({
    providers: [
        LobbyGateway,
        LobbyService
    ],
    exports: [LobbyService],
    imports: [UsersModule, forwardRef(() => GameStateModule), SocketConnectionModule]
})
export class LobbyModule {
    
}
