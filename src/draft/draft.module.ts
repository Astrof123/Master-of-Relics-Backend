import { forwardRef, Module } from '@nestjs/common';
import { DraftService } from './draft.service';
import { DraftGateway } from './draft.gateway';
import { GameStateModule } from 'src/game-state/game-state.module';
import { PhaseModule } from 'src/phase/phase.module';
import { ArtifactModule } from 'src/artifact/artifact.module';

@Module({
    providers: [DraftService, DraftGateway],
    imports: [
        forwardRef(() => PhaseModule),
        forwardRef(() => GameStateModule),
        forwardRef(() => ArtifactModule),
    ],
    exports: [DraftService],
})
export class DraftModule {}
