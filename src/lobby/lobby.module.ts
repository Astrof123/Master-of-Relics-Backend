import { Module } from '@nestjs/common';
import { LobbyGateway } from './lobby.gateway';
import { LobbyService } from './lobby.service';
import { UsersModule } from 'src/users/users.module';

@Module({
    providers: [
        LobbyGateway,
        LobbyService
    ],
    exports: [],
    imports: [UsersModule]
})
export class LobbyModule {
    
}
