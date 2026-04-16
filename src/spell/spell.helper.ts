import { RESOURCE, ResourceType } from "src/game-mechanics/types/resource";
import { Spell, SPELL, SPELLTYPE, SpellType } from "./types/spell";
import { SpellGameState } from "src/game-state/types/game";
import { SPELLS } from "./constants/spells";

export class SpellHelper {
    static getResource(type: SpellType): ResourceType {
        switch (type) {
            case SPELLTYPE.LIGHT:
                return RESOURCE.LIGHT_MANA;
            case SPELLTYPE.DESTRUCTION:
                return RESOURCE.DESTRUCTION_MANA;
            case SPELLTYPE.DARK:
                return RESOURCE.DARK_MANA;
            default:
                return RESOURCE.DARK_MANA;
        }
    }

    static getDefaultSpellState(spellId: Spell): SpellGameState {
        return {
            id: spellId,
            description: SPELLS[spellId].description,
            cost: SPELLS[spellId].cost,
            cooldown: false,
            canUse: false,
            possibleTargets: [],
            countAnyTarget: SPELLS[spellId].countAnyTarget,
            countTargetEnemy: SPELLS[spellId].countTargetEnemy,
            countTargetAllies: SPELLS[spellId].countTargetAllies
        }
    }
}