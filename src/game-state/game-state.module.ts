import { forwardRef, Module } from '@nestjs/common';
import { GameStateService } from './game-state.service';
import { LobbyModule } from 'src/lobby/lobby.module';
import { GameStateGateway } from './game-state.gateway';

@Module({
  providers: [GameStateService, GameStateGateway],
  imports: [forwardRef(() => LobbyModule)],
  exports: [GameStateService]
})
export class GameStateModule {}
