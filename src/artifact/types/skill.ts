import { SetMetadata } from "@nestjs/common";
import { Restriction, TargetRestriction } from "src/action/types/restriction";

export interface SkillDataType {
    id: Skill;
    type: "active" | "passive"
    cost: number | null;
    description: string;
    countAnyTarget: number;
    countTargetEnemy: number;
    countTargetAllies: number;
    restrictions: Restriction[];
    targetRestrictions: TargetRestriction[];
}

export const SKILL  = {
    FEAR: 'fear',
    FROZE: 'froze',
    NEIGHBORING_HEALING: 'neighboring_healing',
    EAT_LIGHT_MANA: 'eat_light_mana',
    EAT_DARK_MANA: 'eat_dark_mana',
    EAT_DESTRUCTION_MANA: 'eat_destruction_mana',
    SWIFT: 'swift',
    LIGHT_MANA_DISCOUNT: 'light_mana_discount',
    DARK_MANA_DISCOUNT: 'dark_mana_discount',
    DESTRUCTION_MANA_DISCOUNT: 'destruction_mana_discount',
    RAGE_DISCOUNT: 'rage_discount',
    REFRESH_SPELLS: 'refresh_spells',
    FREE_SPELL: 'free_spell',
    MOON_BEAM: 'moon_beam',
    UPGRADE: 'upgrade',
    SPAWN_BONES: 'spawn_bones',
    BERSERK: 'berserk',
    SPAWN_SELF_COPY: 'spawn_self_copy',
    GLIMPSE: 'glimpse',
    HUNT: 'hunt',
    DISPERSAL_ALLY: 'dispersal_ally',
    DISPERSAL_ENEMY: 'dispersal_enemy',
    INVISIBLE: 'invisible',
    ONE_ATTACK_SHIELD: 'one_attack_shield',
    DREAM: 'dream',
    BLINDLESS: 'blindless',
    HOOK: 'hook',
    ARTIFACT_SILENCE: 'artifact_silence',
    EXHAUSTION: 'exhaustion',
    AVATAR: 'avatar',
    STEAL_LIGHT_MANA: 'steal_light_mana',
    STEAL_DARK_MANA: 'steal_dark_mana',
    STEAL_DESTRUCTION_MANA: 'steal_destruction_mana',
    STEAL_RAGE: 'steal_rage',
    STEAL_AGILITY: 'steal_agility',
    REPAIR: 'repair',
    HARDENING: 'hardening',
    RUSTING: 'rusting',
};

export type Skill  = typeof SKILL [keyof typeof SKILL];


