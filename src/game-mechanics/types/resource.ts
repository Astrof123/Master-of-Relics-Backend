export const RESOURCE  = {
    AGILITY: 'agility',
    LIGHT_MANA: 'light_mana',
    RAGE: 'rage',
    DARK_MANA: 'dark_mana',
    DESTRUCTION_MANA: 'destruction_mana'
};

export type ResourceType  = typeof RESOURCE [keyof typeof RESOURCE];