
export const EFFECT_DURATION  = {
    ALWAYS: 'always',
    ONE_USE: 'one_use',
    CURRENT_ROUND: 'current_round'
};

export type EffectDuration  = typeof EFFECT_DURATION [keyof typeof EFFECT_DURATION];


export interface EffectType {
    id: number;
    name: string;
    duration: EffectDuration;
}