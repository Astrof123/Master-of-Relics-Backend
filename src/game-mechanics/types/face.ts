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
    THREE_DARK_MANA: "three_dark_mana",
    THREE_LIGHT_MANA: "three_light_mana",
    THREE_DESTRUCTION_MANA: "three_destruction_mana",
    ONE_EVERY_MANA: "one_every_mana",
    ONE_RAGE_TWO_TARGET: "one_rage_two_target",
    TWO_RAGE_ONE_TARGET: "two_rage_one_target",
    THREE_HEART: "three_heart",
    ONE_RAGE_TWO_HEART: "one_rage_two_heart",
    THREE_AGILITY: "three_agility",
    THREE_RAGE: "three_rage"
};

export type Face  = typeof FACE [keyof typeof FACE];