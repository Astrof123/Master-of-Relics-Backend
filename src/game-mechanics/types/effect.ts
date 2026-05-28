export const EFFECT_DURATION = {
    ALWAYS: 'always',
    ONE_USE: 'one_use',
    CURRENT_ROUND: 'current_round',
};

export type EffectDuration =
    (typeof EFFECT_DURATION)[keyof typeof EFFECT_DURATION];

export interface EffectType {
    id: Effect;
    name: string;
    duration: EffectDuration;
    type: 'positive' | 'negative';
    number: number | null;
    dispellType: DispellType;
    effectCasterGameId?: string;
}

export const DISPELL_TYPE = {
    NORMAL: 'normal',
    STRONG: 'strong',
    NEVER: 'never',
    PASSIVE: 'passive',
};

export type DispellType = (typeof DISPELL_TYPE)[keyof typeof DISPELL_TYPE];

export const EFFECT = {
    SINGLE_CHARGE: 'single_charge',
    EXTRA_MOVE: 'extra_move',
    USED_SKILL_CHARGES: 'used_skill_charges',
    LIGHT_MANA_DISCOUNT: 'light_mana_discount',
    DARK_MANA_DISCOUNT: 'dark_mana_discount',
    DESTRUCTION_MANA_DISCOUNT: 'destruction_mana_discount',
    RAGE_DISCOUNT: 'rage_discount',
    FREE_SPELL: 'free_spell',
    UPGRADE: 'upgrade',
    LIVE_FOR_ROUND: 'live_for_round',
    BERSERK: 'berserk',
    COPY: 'copy',
    GLIMPSE: 'glimpse',
    HUNT: 'hunt',
    INVISIBLE: 'invisible',
    ONE_ATTACK_SHIELD: 'one_attack_shield',
    BLINDLESS: 'blindless',
    EXHAUSTION: 'exhaustion',
    ARTIFACT_SILENCE: 'artifact_silence',
    AVATAR: 'avatar',
    VAMPIRISM: 'vampirism',
    RUST: 'rust',
    DIVINE_GUARD: 'divine_guard',
    SHARP: 'sharp',
    SHIV: 'shiv',
    LIGHT_BLIGHT: 'light_blight',
    DARK_BLIGHT: 'dark_blight',
    DESTRUCTION_BLIGHT: 'destruction_blight',
    PIERCE: 'pierce',
    // MULTISHOT: 'multishot',
};

export type Effect = (typeof EFFECT)[keyof typeof EFFECT];
