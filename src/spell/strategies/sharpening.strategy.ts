import { GameForLogic } from 'src/game-state/types/game-for-logic';
import { SpellStrategy } from '../types/strategy';
import { UseSpellData } from 'src/action/types/action-evens-data';
import { AnimationData } from 'src/action/types/animation';
import { Injectable } from '@nestjs/common';
import { CombatService } from 'src/game-mechanics/combat.service';
import { SPELL, Spell } from '../types/spell';
import { Player } from 'src/game-state/types/game';
import { GameEffectsService } from 'src/game-mechanics/game-effects.service';
import { EFFECTS } from 'src/game-mechanics/constants/effects';
import { EFFECT } from 'src/game-mechanics/types/effect';

@Injectable()
export class SharpeningStrategy implements SpellStrategy {
    constructor(
        private readonly combatService: CombatService,
        private readonly gameEffectsService: GameEffectsService,
    ) {}

    getSpellType(): Spell {
        return SPELL.SHARPENING;
    }

    execute(
        gameState: GameForLogic,
        player: Player,
        data: UseSpellData,
        animations: AnimationData[],
        logParts: string[],
    ) {
        for (const artifact of Object.values(player.artifacts)) {
            this.gameEffectsService.applyEffect(
                artifact,
                EFFECTS[EFFECT.SHARP],
                [],
            );
        }
    }
}
