import { forwardRef, Module } from '@nestjs/common';
import { PhaseService } from './phase.service';
import { RedisModule } from 'src/redis/redis.module';
import { GameStateModule } from 'src/game-state/game-state.module';
import { GameMechanicsModule } from 'src/game-mechanics/game-mechanics.module';
import { ArtifactModule } from 'src/artifact/artifact.module';
import { SpellModule } from 'src/spell/spell.module';
import { CollectionModule } from 'src/collection/collection.module';
import { LobbyModule } from 'src/lobby/lobby.module';
import { UsersModule } from 'src/users/users.module';

@Module({
    providers: [PhaseService],
    imports: [
        RedisModule, 
        forwardRef(() => GameStateModule), 
        GameMechanicsModule, 
        forwardRef(() => ArtifactModule),
        SpellModule,
        CollectionModule,
        forwardRef(() => LobbyModule),
        UsersModule
    ],
    exports: [PhaseService]
})
export class PhaseModule {}
