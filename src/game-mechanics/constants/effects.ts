import { DISPELL_TYPE, EFFECT, Effect, EFFECT_DURATION, EffectType } from "../types/effect";

export const EFFECTS: Record<Effect, EffectType> = {
    [EFFECT.SINGLE_CHARGE]: {
        id: EFFECT.SINGLE_CHARGE,
        name: "Single Charge",
        duration: EFFECT_DURATION.ALWAYS,
        type: 'negative',
        number: null,
        dispellType: DISPELL_TYPE.NEVER
    },
    [EFFECT.USED_SKILL_CHARGES]: {
        id: EFFECT.USED_SKILL_CHARGES,
        name: "Used One Charge",
        duration: EFFECT_DURATION.CURRENT_ROUND,
        type: 'negative',
        number: null,
        dispellType: DISPELL_TYPE.NEVER
    },
    [EFFECT.LIGHT_MANA_DISCOUNT]: {
        id: EFFECT.LIGHT_MANA_DISCOUNT,
        name: "Light Mana Discount",
        duration: EFFECT_DURATION.ALWAYS,
        type: 'positive',
        number: null,
        dispellType: DISPELL_TYPE.PASSIVE
    },
    [EFFECT.DARK_MANA_DISCOUNT]: {
        id: EFFECT.DARK_MANA_DISCOUNT,
        name: "Dark Mana Discount",
        duration: EFFECT_DURATION.ALWAYS,
        type: 'positive',
        number: null,
        dispellType: DISPELL_TYPE.PASSIVE
    },
    [EFFECT.DESTRUCTION_MANA_DISCOUNT]: {
        id: EFFECT.DESTRUCTION_MANA_DISCOUNT,
        name: "Destruction Mana Discount",
        duration: EFFECT_DURATION.ALWAYS,
        type: 'positive',
        number: null,
        dispellType: DISPELL_TYPE.PASSIVE
    },
    [EFFECT.RAGE_DISCOUNT]: {
        id: EFFECT.RAGE_DISCOUNT,
        name: "Rage Discount",
        duration: EFFECT_DURATION.ALWAYS,
        type: 'positive',
        number: null,
        dispellType: DISPELL_TYPE.PASSIVE
    },
    [EFFECT.UPGRADE]: {
        id: EFFECT.UPGRADE,
        name: "Upgrade",
        duration: EFFECT_DURATION.ALWAYS,
        type: 'positive',
        number: 1,
        dispellType: DISPELL_TYPE.NEVER
    },
    [EFFECT.BERSERK]: {
        id: EFFECT.BERSERK,
        name: "Berserk",
        duration: EFFECT_DURATION.ALWAYS,
        type: 'positive',
        number: null,
        dispellType: DISPELL_TYPE.PASSIVE
    },
    [EFFECT.COPY]: {
        id: EFFECT.COPY,
        name: "Copy",
        duration: EFFECT_DURATION.ALWAYS,
        type: "negative",
        number: null,
        dispellType: DISPELL_TYPE.NEVER
    },
    [EFFECT.GLIMPSE]: {
        id: EFFECT.GLIMPSE,
        name: "Glimpse",
        duration: EFFECT_DURATION.ALWAYS,
        type: 'positive',
        number: null,
        dispellType: DISPELL_TYPE.PASSIVE
    },
    [EFFECT.HUNT]: {
        id: EFFECT.HUNT,
        name: "Hunt",
        duration: EFFECT_DURATION.ALWAYS,
        type: 'positive',
        number: null,
        dispellType: DISPELL_TYPE.PASSIVE
    },
    [EFFECT.LIVE_FOR_ROUND]: {
        id: EFFECT.LIVE_FOR_ROUND,
        name: "Live For Round",
        duration: EFFECT_DURATION.ALWAYS,
        type: "negative",
        number: null,
        dispellType: DISPELL_TYPE.NEVER
    },
    [EFFECT.INVISIBLE]: {
        id: EFFECT.INVISIBLE,
        name: "Invisible",
        duration: EFFECT_DURATION.CURRENT_ROUND,
        type: "positive",
        number: null,
        dispellType: DISPELL_TYPE.NEVER
    },
    [EFFECT.FREE_SPELL]: {
        id: EFFECT.FREE_SPELL,
        name: "Free Spell",
        duration: EFFECT_DURATION.CURRENT_ROUND,
        type: "positive",
        number: null,
        dispellType: DISPELL_TYPE.NEVER
    },
    [EFFECT.ONE_ATTACK_SHIELD]: {
        id: EFFECT.ONE_ATTACK_SHIELD,
        name: "One Attack Shield",
        duration: EFFECT_DURATION.CURRENT_ROUND,
        type: "positive",
        number: null,
        dispellType: DISPELL_TYPE.NORMAL
    },
    [EFFECT.BLINDLESS]: {
        id: EFFECT.BLINDLESS,
        name: "Blindness",
        duration: EFFECT_DURATION.CURRENT_ROUND,
        type: "negative",
        number: null,
        dispellType: DISPELL_TYPE.NORMAL
    },
    [EFFECT.EXHAUSTION]: {
        id: EFFECT.EXHAUSTION,
        name: "Exhaustion",
        duration: EFFECT_DURATION.CURRENT_ROUND,
        type: "negative",
        number: null,
        dispellType: DISPELL_TYPE.NORMAL
    },
    [EFFECT.ARTIFACT_SILENCE]: {
        id: EFFECT.ARTIFACT_SILENCE,
        name: "Silence",
        duration: EFFECT_DURATION.CURRENT_ROUND,
        type: "negative",
        number: null,
        dispellType: DISPELL_TYPE.NORMAL
    },
    [EFFECT.AVATAR]: {
        id: EFFECT.AVATAR,
        name: "Avatar",
        duration: EFFECT_DURATION.CURRENT_ROUND,
        type: "positive",
        number: null,
        dispellType: DISPELL_TYPE.NORMAL
    },
    [EFFECT.VAMPIRISM]: {
        id: EFFECT.VAMPIRISM,
        name: "Vampirism",
        duration: EFFECT_DURATION.CURRENT_ROUND,
        type: "positive",
        number: null,
        dispellType: DISPELL_TYPE.NORMAL
    },
    [EFFECT.RUST]: {
        id: EFFECT.RUST,
        name: "Rust",
        duration: EFFECT_DURATION.CURRENT_ROUND,
        type: "negative",
        number: null,
        dispellType: DISPELL_TYPE.NORMAL
    },
    [EFFECT.DIVINE_GUARD]: {
        id: EFFECT.DIVINE_GUARD,
        name: "Divine Guard",
        duration: EFFECT_DURATION.CURRENT_ROUND,
        type: "positive",
        number: null,
        dispellType: DISPELL_TYPE.NORMAL
    },
    [EFFECT.SHARP]: {
        id: EFFECT.SHARP,
        name: "Sharp",
        duration: EFFECT_DURATION.CURRENT_ROUND,
        type: "positive",
        number: null,
        dispellType: DISPELL_TYPE.NORMAL
    },
}