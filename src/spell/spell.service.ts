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
        private readonly gameEffectsService: GameEffectsService,
    ) {}

    calculateSpellActions(
        gameState: GameForLogic,
        player: Player,
        enemy: Player,
    ) {
        const spellsLight = Object.values(player.spells[SPELLTYPE.LIGHT]);
        for (const spell of spellsLight) {
            spell.cost = SPELLS[spell.id].cost;
            const countDiscount = this.gameEffectsService.countHeroEffect(
                player,
                EFFECT.LIGHT_MANA_DISCOUNT,
            );
            spell.cost -= 5 * countDiscount;
            spell.cost = spell.cost > 0 ? spell.cost : 0;

            spell.canUse = this.checkCanUse(player, enemy, spell);
            const restrictions = [...SPELLS[spell.id].targetRestrictions];
            spell.possibleTargets =
                this.restrictionService.getTargetsByRestrictions(
                    player,
                    enemy,
                    restrictions,
                );
        }

        const spellsDark = Object.values(player.spells[SPELLTYPE.DARK]);
        for (const spell of spellsDark) {
            spell.cost = SPELLS[spell.id].cost;
            const countDiscount = this.gameEffectsService.countHeroEffect(
                player,
                EFFECT.DARK_MANA_DISCOUNT,
            );
            spell.cost -= 5 * countDiscount;
            spell.cost = spell.cost > 0 ? spell.cost : 0;

            const restrictions = [...SPELLS[spell.id].targetRestrictions];
            spell.canUse = this.checkCanUse(player, enemy, spell);
            spell.possibleTargets =
                this.restrictionService.getTargetsByRestrictions(
                    player,
                    enemy,
                    restrictions,
                );
        }

        const spellsDestruction = Object.values(
            player.spells[SPELLTYPE.DESTRUCTION],
        );
        for (const spell of spellsDestruction) {
            spell.cost = SPELLS[spell.id].cost;
            const countDiscount = this.gameEffectsService.countHeroEffect(
                player,
                EFFECT.DESTRUCTION_MANA_DISCOUNT,
            );
            spell.cost -= 5 * countDiscount;
            spell.cost = spell.cost > 0 ? spell.cost : 0;

            const restrictions = [...SPELLS[spell.id].targetRestrictions];
            spell.canUse = this.checkCanUse(player, enemy, spell);
            spell.possibleTargets =
                this.restrictionService.getTargetsByRestrictions(
                    player,
                    enemy,
                    restrictions,
                );
        }
    }

    checkCanUse(player: Player, enemy: Player, spell: SpellGameState) {
        const spellData = SPELLS[spell.id];
        const neededResource = SpellHelper.getResource(spellData.type);

        let cost = spell.cost;
        if (
            this.gameEffectsService.countHeroEffect(player, EFFECT.FREE_SPELL) >
            0
        ) {
            cost = 0;
        }

        if (
            spellData.type === SPELLTYPE.LIGHT &&
            this.gameEffectsService.countHeroEffect(
                player,
                EFFECT.LIGHT_BLIGHT,
            ) > 0
        ) {
            return false;
        }

        if (
            spellData.type === SPELLTYPE.DARK &&
            this.gameEffectsService.countHeroEffect(
                player,
                EFFECT.DARK_BLIGHT,
            ) > 0
        ) {
            return false;
        }

        if (
            spellData.type === SPELLTYPE.DESTRUCTION &&
            this.gameEffectsService.countHeroEffect(
                player,
                EFFECT.DESTRUCTION_BLIGHT,
            ) > 0
        ) {
            return false;
        }

        if (player.resources[neededResource] >= cost && !spell.cooldown) {
            if (
                this.restrictionService.checkGeneralRestrictions(
                    player,
                    enemy,
                    spellData.restrictions,
                )
            ) {
                if (
                    this.restrictionService.checkSpellRestrictions(
                        enemy,
                        spellData.restrictions,
                    )
                ) {
                    return true;
                }
            }
        }
        return false;
    }
}
