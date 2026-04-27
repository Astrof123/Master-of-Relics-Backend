import { forwardRef, Module } from '@nestjs/common';
import { RedisModule } from 'src/redis/redis.module';
import { ResourceService } from './resource.service';
import { GameStateModule } from 'src/game-state/game-state.module';
import { ArtifactStateService } from './artifact-state.service';
import { DiceService } from './dice.service';
import { CombatService } from './combat.service';
import { GameEffectsService } from './game-effects.service';

@Module({
    providers: [ResourceService, ArtifactStateService, DiceService, CombatService, GameEffectsService],
    imports: [RedisModule, forwardRef(() => GameStateModule)],
    exports: [ResourceService, ArtifactStateService, DiceService, CombatService, GameEffectsService]
})
export class GameMechanicsModule {}
