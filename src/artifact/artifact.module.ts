import { forwardRef, Module } from '@nestjs/common';
import { ArtifactService } from './artifact.service';
import { ActionModule } from 'src/action/action.module';
import { FearStrategy } from './strategies/fear.strategy';
import { SkillsStrategyFactory } from './skills.factory';
import { SKILL_TYPE_KEY } from './types/skill';
import { FrozeStrategy } from './strategies/froze.strategy';
import { GameMechanicsModule } from 'src/game-mechanics/game-mechanics.module';
import { SwiftStrategy } from './strategies/swift.strategy';
import { UniversalHealingStrategy } from './strategies/universal-healing.strategy';
import { EatDestructionManaStrategy } from './strategies/eat-destruction-mana.strategy';
import { EatDarkManaStrategy } from './strategies/eat-dark-mana.strategy';
import { EatLightManaStrategy } from './strategies/eat-light-mana.strategy';

const ACTION_HANDLER_PROVIDERS = [
    FearStrategy,
    FrozeStrategy,
    SwiftStrategy,
    UniversalHealingStrategy,
    EatDestructionManaStrategy,
    EatDarkManaStrategy,
    EatLightManaStrategy
];

@Module({
    providers: [
        ArtifactService,
        ...ACTION_HANDLER_PROVIDERS,
        SkillsStrategyFactory,
        {
            provide: SKILL_TYPE_KEY,
            useFactory: (...handlers) => handlers,
            inject: ACTION_HANDLER_PROVIDERS,
        },
    ],
    exports: [ArtifactService, SkillsStrategyFactory],
    imports: [forwardRef(() => ActionModule), GameMechanicsModule]
})
export class ArtifactModule {}
