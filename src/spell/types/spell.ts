import { Restriction, TargetRestriction } from "src/action/types/restriction";
import { RESOURCE, ResourceType } from "src/game-mechanics/types/resource";

export const SPELLTYPE  = {
    DARK: 'dark',
    LIGHT: 'light',
    DESTRUCTION: 'destruction',


};

export type SpellType  = typeof SPELLTYPE [keyof typeof SPELLTYPE];


export interface SpellDataType {
    id: Spell;
    name: string;
    type: SpellType;
    cost: number;
    description: string;
    countAnyTarget: number;
    countTargetEnemy: number;
    countTargetAllies: number;
    restrictions: Restriction[];
    targetRestrictions: TargetRestriction[];
}

export const SPELL  = {
    PIERCING_BOLT: 'piercing_bolt',
    TOUCH_OF_LIGHT: 'touch_of_light',
};

export type Spell  = typeof SPELL [keyof typeof SPELL];

