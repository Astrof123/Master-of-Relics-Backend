import { forwardRef, Module } from '@nestjs/common';
import { SpellService } from './spell.service';
import { PiercingBoltStrategy } from './strategies/piercing-bolt.strategy';
import { SpellStrategyFactory } from './spell.factory';
import { SPELL_TYPE_KEY } from './constants/settings';
import { TouchOfLightStrategy } from './strategies/touch-of-light.strategy';
import { ActionModule } from 'src/action/action.module';
import { GameMechanicsModule } from 'src/game-mechanics/game-mechanics.module';

const ACTION_HANDLER_PROVIDERS = [
    PiercingBoltStrategy,
    TouchOfLightStrategy,
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
    imports: [forwardRef(() => ActionModule), GameMechanicsModule]
})
export class SpellModule {}
