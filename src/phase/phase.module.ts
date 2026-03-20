import { forwardRef, Module } from '@nestjs/common';
import { PhaseService } from './phase.service';
import { RedisModule } from 'src/redis/redis.module';
import { GameStateModule } from 'src/game-state/game-state.module';
import { GameMechanicsModule } from 'src/game-mechanics/game-mechanics.module';
import { ArtifactModule } from 'src/artifact/artifact.module';

@Module({
    providers: [PhaseService],
    imports: [
        RedisModule, 
        GameStateModule, 
        GameMechanicsModule, 
        forwardRef(() => ArtifactModule)
    ],
    exports: [PhaseService]
})
export class PhaseModule {}
