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
    METEOR_SHOWER: 'meteor_shower',
    VOLCANO: 'volcano',
    FURY: 'fury',
    THUNDER_STORM: 'thunder_storm',
    BETRAYAL: 'betrayal',
    VAMPIRISM: 'vampirism',
    COLD_TOUCH: 'cold_touch',
    RUST: 'rust',
    WEAKNESS: 'weakness',
    DIVINE_GUARD: 'divine_guard',
    RESURRECTION: 'resurrection',
    INSPIRATION: 'inspiration',
    SHARPENING: 'sharpening',
};

export type Spell  = typeof SPELL [keyof typeof SPELL];

