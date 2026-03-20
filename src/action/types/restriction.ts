export const RESTRICTION = {
    ONLY_READY: "only_ready",
    ONLY_COOLDOWN: "only_cooldown",
    BACK_LINE_IS_FREE: "back_line_is_free",
    HAVE_ENEMY_FOR_SKILLS: "have_enemy_for_skills",
    HAVE_TEN_LIGHT_MANA: "have_ten_light_mana",
    HAVE_TEN_DARK_MANA: "have_ten_dark_mana",
    HAVE_TEN_DESTRUCTION_MANA: "have_ten_destruction_mana",
    ZERO_USED_SKILL_CHARGES: "zero_used_skill_charges",
}

export type Restriction = typeof RESTRICTION[keyof typeof RESTRICTION];


export const TARGET_RESTRICTION = {
    ANY_ENEMY: "only_enemy",
    ONLY_FRONT_LINE_ENEMY: "only_front_line_enemy",
}

export type TargetRestriction = typeof TARGET_RESTRICTION[keyof typeof TARGET_RESTRICTION];