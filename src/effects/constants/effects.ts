import { EFFECT_DURATION, EffectType } from "../types/effect";

export const EFFECTS: Record<number, EffectType> = {
    [1]: {
        id: 1,
        name: "Single Charge",
        duration: EFFECT_DURATION.ALWAYS
    },
}