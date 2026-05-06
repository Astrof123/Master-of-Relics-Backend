export const RESTRICTION = {
    ONLY_READY: "only_ready",
    ONLY_COOLDOWN: "only_cooldown",
    ONLY_ROOTED: "only_rooted",
    ONLY_BREAKEN: "only_breaken",
    ENEMY_BACK_LINE_IS_FREE: "enemy_back_line_is_free",
    ENEMY_FRONT_LINE_IS_FREE: "enemy_front_line_is_free",
    HAVE_ENEMY_FOR_SKILLS: "have_enemy_for_skills",
    HAVE_ALLY_FOR_SKILLS: "have_ally_for_skills",
    HAVE_TEN_LIGHT_MANA: "have_ten_light_mana",
    HAVE_TEN_DARK_MANA: "have_ten_dark_mana",
    HAVE_TEN_DESTRUCTION_MANA: "have_ten_destruction_mana",
    HAVE_TEN_AGILITY: "have_ten_agility",
    HAVE_TEN_RAGE: "have_ten_rage",
    ENEMY_HAVE_TEN_LIGHT_MANA: "have_ten_light_mana",
    ENEMY_HAVE_TEN_DARK_MANA: "have_ten_dark_mana",
    ENEMY_HAVE_TEN_DESTRUCTION_MANA: "have_ten_destruction_mana",
    ENEMY_HAVE_TEN_AGILITY: "have_ten_agility",
    ENEMY_HAVE_TEN_RAGE: "have_ten_rage",
    ZERO_USED_SKILL_CHARGES: "zero_used_skill_charges",
    PROCESS_ONLY_IN_NEW_STATE: "process_only_in_new_state",
    FRONT_LINE_HAVE_TWO_FREE_SPOT: "front_line_have_two_free_spot",
    FRONT_LINE_HAVE_ONE_FREE_SPOT: "front_line_have_one_free_spot",
    SAME_LINE_HAVE_ONE_FREE_SPOT: "same_line_have_two_free_spot",
    NO_INVISIBLE: "no_invisible",
}

export type Restriction = typeof RESTRICTION[keyof typeof RESTRICTION];


export const TARGET_RESTRICTION = {
    ANY_ENEMY: "any_enemy",
    ANY_ALLY: "any_ally",
    ALIVE: "alive",
    BREAKEN: "breaken",
    ONLY_FRONT_LINE_ENEMY: "only_front_line_enemy",
    ONLY_BACK_LINE_ENEMY: "only_back_line_enemy",
    NEED_HEAL_ALLY: "need_heal_ally",
    NORMAL_STATE: "normal_state",
    NO_AVATAR: "no_avatar",
    CAN_ATTACK: "can_attack"
}

export type TargetRestriction = typeof TARGET_RESTRICTION[keyof typeof TARGET_RESTRICTION];