import { forwardRef, Module } from '@nestjs/common';
import { SpellService } from './spell.service';
import { PiercingBoltStrategy } from './strategies/piercing-bolt.strategy';
import { SpellStrategyFactory } from './spell.factory';
import { SPELL_TYPE_KEY } from './constants/settings';
import { TouchOfLightStrategy } from './strategies/touch-of-light.strategy';
import { ActionModule } from 'src/action/action.module';
import { GameMechanicsModule } from 'src/game-mechanics/game-mechanics.module';
import { ArtifactService } from 'src/artifact/artifact.service';
import { MeteorShowerStrategy } from './strategies/meteor-shower.strategy';
import { BetrayalStrategy } from './strategies/betrayal.strategy';
import { FuryStrategy } from './strategies/fury.strategy';
import { ThunderStormStrategy } from './strategies/thunder-storm.strategy';
import { VampirismStrategy } from './strategies/vampirism.strategy';
import { ArtifactModule } from 'src/artifact/artifact.module';
import { ColdTouchStrategy } from './strategies/cold-touch.strategy';
import { RustStrategy } from './strategies/rust.strategy';
import { WeaknessStrategy } from './strategies/weakness.strategy';
import { DivineGuardStrategy } from './strategies/divine-guard.strategy';
import { ResurrectionStrategy } from './strategies/resurrection.strategy';
import { InspirationStrategy } from './strategies/inspiration.strategy';
import { SharpeningStrategy } from './strategies/sharpening.strategy';
import { VolcanoStrategy } from './strategies/volcano.strategy';

const ACTION_HANDLER_PROVIDERS = [
    PiercingBoltStrategy,
    TouchOfLightStrategy,
    MeteorShowerStrategy,
    BetrayalStrategy,
    FuryStrategy,
    ThunderStormStrategy,
    VampirismStrategy,
    ColdTouchStrategy,
    RustStrategy,
    WeaknessStrategy,
    DivineGuardStrategy,
    ResurrectionStrategy,
    InspirationStrategy,
    SharpeningStrategy,
    VolcanoStrategy
];

@Module({
    providers: [
        SpellService,
        ...ACTION_HANDLER_PROVIDERS,
        SpellStrategyFactory,
        {
            provide: SPELL_TYPE_KEY,
            useFactory: (...handlers) => handlers,
            inject: ACTION_HANDLER_PROVIDERS,
        },
    ],
    exports: [SpellService, SpellStrategyFactory],
    imports: [forwardRef(() => ActionModule), forwardRef(() => GameMechanicsModule), forwardRef(() => ArtifactModule) ]
})
export class SpellModule {}
