import { RESTRICTION, TARGET_RESTRICTION } from "src/action/types/restriction";
import { SPELL, Spell, SpellDataType, SPELLTYPE } from "../types/spell";


export const SPELLS: Record<Spell, SpellDataType> = {
    [SPELL.TOUCH_OF_LIGHT]: {
        id: SPELL.TOUCH_OF_LIGHT,
        type: SPELLTYPE.LIGHT,
        cost: 20,
        description: "Применить способность",
        countAnyTarget: 1,
        countTargetEnemy: 0,
        countTargetAllies: 0,
        restrictions: [],
        targetRestrictions: [TARGET_RESTRICTION.ANY_ENEMY, TARGET_RESTRICTION.ANY_ALLY, TARGET_RESTRICTION.ALIVE]
    },
    [SPELL.PIERCING_BOLT]: {
        id: SPELL.PIERCING_BOLT,
        type: SPELLTYPE.DESTRUCTION,
        cost: 15,
        description: "Нанести 15 урона вражескому артефакту",
        countAnyTarget: 0,
        countTargetEnemy: 1,
        countTargetAllies: 0,
        restrictions: [],
        targetRestrictions: [TARGET_RESTRICTION.ANY_ENEMY, TARGET_RESTRICTION.ALIVE]
    },
}

