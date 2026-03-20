
export const EFFECT_DURATION  = {
    ALWAYS: 'always',
    ONE_USE: 'one_use',
    CURRENT_ROUND: 'current_round'
};

export type EffectDuration  = typeof EFFECT_DURATION [keyof typeof EFFECT_DURATION];


export interface EffectType {
    id: Effect;
    name: string;
    duration: EffectDuration;
    type: "positive" | "negative";
    number: number | null;
}

export const EFFECT  = {
    SINGLE_CHARGE: 'single_charge',
    EXTRA_MOVE: 'extra_move',
    USED_SKILL_CHARGES: 'used_skill_charges',
};

export type Effect  = typeof EFFECT [keyof typeof EFFECT];