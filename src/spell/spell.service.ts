import { Injectable } from '@nestjs/common';
import { Player, SpellGameState } from 'src/game-state/types/game';
import { GameForLogic } from 'src/game-state/types/game-for-logic';
import { SpellDataType, SPELLTYPE } from './types/spell';
import { RestrictionService } from 'src/action/restriction.service';
import { RESOURCE } from 'src/game-mechanics/types/resource';
import { SPELLS } from './constants/spells';
import { SpellHelper } from './spell.helper';

@Injectable()
export class SpellService {
    constructor(
        private readonly restrictionService: RestrictionService,
    ) {}

    calculateSpellActions(gameState: GameForLogic, player: Player, enemy: Player) {
        const spellsLight = Object.values(player.spells[SPELLTYPE.LIGHT]);
        for (const spell of spellsLight) {
            spell.cost = spell.cost;
            spell.canUse = this.checkCanUse(player, enemy, spell);
            spell.possibleTargets = this.restrictionService.getTargetsByRestrictions(player, enemy, SPELLS[spell.id].targetRestrictions);
        }

        const spellsDark = Object.values(player.spells[SPELLTYPE.DARK]);
        for (const spell of spellsDark) {
            spell.cost = spell.cost;
            spell.canUse = this.checkCanUse(player, enemy, spell);
            spell.possibleTargets = this.restrictionService.getTargetsByRestrictions(player, enemy, SPELLS[spell.id].targetRestrictions);
        }

        const spellsDestruction = Object.values(player.spells[SPELLTYPE.DESTRUCTION]);
        for (const spell of spellsDestruction) {
            spell.cost = spell.cost;
            spell.canUse = this.checkCanUse(player, enemy, spell);
            spell.possibleTargets = this.restrictionService.getTargetsByRestrictions(player, enemy, SPELLS[spell.id].targetRestrictions);
        }
    }

    checkCanUse(player: Player, enemy: Player, spell: SpellGameState) {
        const spellData = SPELLS[spell.id];
        const neededResource = SpellHelper.getResource(spellData.type);

        if (player.resources[neededResource] >= spellData.cost && !spell.cooldown) {
            if (this.restrictionService.checkGeneralRestrictions(player, enemy, spellData.restrictions)) {
                if (this.restrictionService.checkSpellRestrictions(spellData.restrictions)) {
                    return true;
                }     
            }
        }
        return false;
    }
}
