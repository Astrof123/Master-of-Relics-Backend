export const SPELLTYPE  = {
    DARK: 'dark',
    LIGHT: 'light',
    DESTRUCTION: 'destruction',
};

export type SpellType  = typeof SPELLTYPE [keyof typeof SPELLTYPE];


// export interface Spell {
//     id: number;
//     name: string;
//     manaCost: number;
//     targetsType: TargetsType;
//     type: SpellType;
// }



