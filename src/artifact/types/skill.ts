import { SetMetadata } from "@nestjs/common";
import { Restriction, TargetRestriction } from "src/action/types/restriction";

export interface SkillDataType {
    id: Skill;
    type: "active" | "passive"
    cost: number;
    description: string;
    countTargetEnemy: number;
    countTargetAllies: number;
    restrictions: Restriction[];
    target_restrictions: TargetRestriction[];
}

export const SKILL  = {
    FEAR: 'fear',
    FROZE: 'froze',
    UNIVERSAL_HEALING: 'universal_healing',
    EAT_LIGHT_MANA: 'eat_light_mana',
    EAT_DARK_MANA: 'eat_dark_mana',
    EAT_DESTRUCTION_MANA: 'eat_destruction_mana',
    SWIFT: 'swift',
};

export type Skill  = typeof SKILL [keyof typeof SKILL];


export const SKILL_TYPE_KEY = 'SKILL_TYPE';