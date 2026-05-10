import { Injectable } from '@nestjs/common';
import { Player, SpellGameState } from 'src/game-state/types/game';
import { GameForLogic } from 'src/game-state/types/game-for-logic';
import { SPELLTYPE } from './types/spell';
import { RestrictionService } from 'src/action/restriction.service';
import { SPELLS } from './constants/spells';
import { SpellHelper } from './spell.helper';
import { GameEffectsService } from 'src/game-mechanics/game-effects.service';
import { EFFECT } from 'src/game-mechanics/types/effect';
import { TARGET_RESTRICTION } from 'src/action/types/restriction';

@Injectable()
export class SpellService {
    constructor(
        private readonly restrictionService: RestrictionService,
        private readonly gameEffectsService: GameEffectsService
        
    ) {}

    calculateSpellActions(gameState: GameForLogic, player: Player, enemy: Player) {
        const spellsLight = Object.values(player.spells[SPELLTYPE.LIGHT]);
        for (const spell of spellsLight) {
            spell.cost = SPELLS[spell.id].cost;
            const countDiscount = this.gameEffectsService.countHeroEffect(player, EFFECT.LIGHT_MANA_DISCOUNT);
            spell.cost -= (5 * countDiscount);

            spell.canUse = this.checkCanUse(player, enemy, spell);
            const restrictions = [...SPELLS[spell.id].targetRestrictions];
            spell.possibleTargets = this.restrictionService.getTargetsByRestrictions(player, enemy, restrictions);
        }

        const spellsDark = Object.values(player.spells[SPELLTYPE.DARK]);
        for (const spell of spellsDark) {
            spell.cost = SPELLS[spell.id].cost;
            const countDiscount = this.gameEffectsService.countHeroEffect(player, EFFECT.DARK_MANA_DISCOUNT);
            spell.cost -= (5 * countDiscount);

            const restrictions = [...SPELLS[spell.id].targetRestrictions];
            spell.canUse = this.checkCanUse(player, enemy, spell);
            spell.possibleTargets = this.restrictionService.getTargetsByRestrictions(player, enemy, restrictions);
        }

        const spellsDestruction = Object.values(player.spells[SPELLTYPE.DESTRUCTION]);
        for (const spell of spellsDestruction) {
            spell.cost = SPELLS[spell.id].cost;
            const countDiscount = this.gameEffectsService.countHeroEffect(player, EFFECT.DESTRUCTION_MANA_DISCOUNT);
            spell.cost -= (5 * countDiscount);

            const restrictions = [...SPELLS[spell.id].targetRestrictions];
            spell.canUse = this.checkCanUse(player, enemy, spell);
            spell.possibleTargets = this.restrictionService.getTargetsByRestrictions(player, enemy, restrictions);
        }
    }

    checkCanUse(player: Player, enemy: Player, spell: SpellGameState) {
        const spellData = SPELLS[spell.id];
        const neededResource = SpellHelper.getResource(spellData.type);

        if (player.resources[neededResource] >= spell.cost && !spell.cooldown) {
            if (this.restrictionService.checkGeneralRestrictions(player, enemy, spellData.restrictions)) {
                if (this.restrictionService.checkSpellRestrictions(enemy, spellData.restrictions)) {
                    return true;
                }     
            }
        }
        return false;
    }
}
