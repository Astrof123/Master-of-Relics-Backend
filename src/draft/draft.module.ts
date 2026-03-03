import { Module } from '@nestjs/common';
import { DraftService } from './draft.service';
import { DraftGateway } from './draft.gateway';
import { GameStateModule } from 'src/game-state/game-state.module';

@Module({
    providers: [DraftService, DraftGateway],
    imports: [GameStateModule]
})
export class DraftModule {}
