export interface FaceDataType {
    id: string;
    description: string;
    target: number;
    sword: number;
    rage: number;
    agility: number;
    light_mana: number;
    dark_mana: number;
    destruction_mana: number;
    heal: number;
}

export const FACE  = {
    AGILITY: 'agility',
    LIGHT_MANA: 'light_mana',
    RAGE: 'rage',
    DARK_MANA: 'dark_mana',
    DESTRUCTION_MANA: 'destruction_mana',
    SWORD: 'sword',
    TARGET: 'target',
    HEAL: "heal",
    THREE_SWORD: "three_sword",
    TWO_SWORD: "two_sword",
    TWO_TARGET: "two_target",
    THREE_TARGET: "three_target",
    THREE_DARK_MANA: "three_dark_mana",
    THREE_LIGHT_MANA: "three_light_mana",
    THREE_DESTRUCTION_MANA: "three_destruction_mana",
    ONE_EVERY_MANA: "one_every_mana",
    ONE_RAGE_TWO_TARGET: "one_rage_two_target",
    TWO_RAGE_ONE_TARGET: "two_rage_one_target",
    THREE_HEART: "three_heart",
    ONE_RAGE_TWO_HEART: "one_rage_two_heart",
    THREE_AGILITY: "three_agility",
    THREE_RAGE: "three_rage",
    TWO_HEART: "two_heart",
    TWO_LIGHT_MANA: "two_light_mana",
    TWO_DARK_MANA: "two_dark_mana",
    TWO_DESTRUCTION_MANA: "two_destruction_mana",
    TWO_RAGE: "two_rage",
    TWO_DARK_MANA_ONE_RAGE: "two_dark_mana_one_rage",
    ONE_RAGE_ONE_TARGET: "one_rage_one_target",
    ONE_SWORD_ONE_RAGE: "one_sword_one_rage",
    ONE_SWORD_ONE_DARK_MANA: "one_sword_one_dark_mana",
    ONE_SWORD_ONE_DESTRUCTION_MANA: "one_sword_one_destruction_mana",
    ONE_SWORD_ONE_LIGHT_MANA: "one_sword_one_light_mana",
    ONE_SWORD_ONE_AGILITY: "one_sword_one_agility",
    ONE_TARGET_ONE_AGILITY: "one_target_one_agility",
    ONE_TARGET_ONE_DESTRUCTION_MANA: "one_target_one_destruction_mana",
    TWO_LIGHT_MANA_ONE_TARGET: "one_light_mana_one_target",
    TWO_TARGET_ONE_LIGHT_MANA: "two_target_one_light_mana",
    FOUR_TARGET: "four_target",
    ONE_DARK_ONE_DESTRUCTION_MANA: "one_dark_one_destruction_mana",
    ONE_DARK_ONE_LIGHT_MANA: "one_dark_one_light_mana",
    ONE_DESTRUCTION_ONE_LIGHT_MANA: "one_destruction_one_light_mana",
    TWO_AGILITY: "two_agility",
    TWO_RAGE_ONE_LIGHT_MANA: "two_rage_one_light_mana",
};

export type Face  = typeof FACE [keyof typeof FACE];