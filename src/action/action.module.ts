import { forwardRef, Module } from '@nestjs/common';
import { ActionGateway } from './action.gateway';
import { GameStateModule } from 'src/game-state/game-state.module';
import { ActionValidatorService } from './action-validator.service';
import { GameMechanicsModule } from 'src/game-mechanics/game-mechanics.module';
import { ActionResolverService } from './action-resolver.service';
import { ActionService } from './action.service';
import { ArtifactModule } from 'src/artifact/artifact.module';
import { ExtraActionService } from './extra-action.service';
import { PhaseModule } from 'src/phase/phase.module';
import { RestrictionService } from './restriction.service';
import { SpellModule } from 'src/spell/spell.module';

@Module({
    providers: [
        ActionGateway, 
        ActionValidatorService, 
        ActionResolverService, 
        ActionService, 
        ExtraActionService,
        RestrictionService
    ],
    imports: [
        forwardRef(() => GameStateModule), 
        GameMechanicsModule, 
        forwardRef(() => PhaseModule), 
        forwardRef(() => ArtifactModule),
        forwardRef(() => SpellModule)
    ],
    exports: [ExtraActionService, RestrictionService, ActionService]
})
export class ActionModule {}
