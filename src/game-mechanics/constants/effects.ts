import { EFFECT, Effect, EFFECT_DURATION, EffectType } from "../types/effect";

export const EFFECTS: Record<Effect, EffectType> = {
    [EFFECT.SINGLE_CHARGE]: {
        id: EFFECT.SINGLE_CHARGE,
        name: "Single Charge",
        duration: EFFECT_DURATION.ALWAYS,
        type: 'negative',
        number: null
    },
    [EFFECT.EXTRA_MOVE]: {
        id: EFFECT.EXTRA_MOVE,
        name: "Дополнительное действие",
        duration: EFFECT_DURATION.ALWAYS,
        type: "positive",
        number: null
    },
    [EFFECT.USED_SKILL_CHARGES]: {
        id: EFFECT.USED_SKILL_CHARGES,
        name: "Used Skill Charges",
        duration: EFFECT_DURATION.CURRENT_ROUND,
        type: 'negative',
        number: 1
    },
}