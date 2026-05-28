import { forwardRef, Module } from '@nestjs/common';
import { GameStateService } from './game-state.service';
import { LobbyModule } from 'src/lobby/lobby.module';
import { GameStateGateway } from './game-state.gateway';
import { GameTimerService } from './game-timer.service';
import { RedisModule } from 'src/redis/redis.module';
import { DraftService } from 'src/draft/draft.service';
import { DraftModule } from 'src/draft/draft.module';
import { ActionModule } from 'src/action/action.module';
import { CollectionModule } from 'src/collection/collection.module';
import { GameEffectsService } from 'src/game-mechanics/game-effects.service';
import { GameMechanicsModule } from 'src/game-mechanics/game-mechanics.module';

@Module({
    providers: [GameStateService, GameStateGateway, GameTimerService],
    imports: [
        forwardRef(() => LobbyModule),
        forwardRef(() => RedisModule),
        forwardRef(() => DraftModule),
        forwardRef(() => ActionModule),
        CollectionModule,
        GameMechanicsModule,
    ],
    exports: [GameStateService, GameTimerService],
})
export class GameStateModule {}
