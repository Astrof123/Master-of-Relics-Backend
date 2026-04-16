export const PHASE  = {
    PICK_HERO: 'pick_hero',
    DRAFT: 'draft',
    BATTLE: 'battle'
} as const;

export type Phase  = typeof PHASE [keyof typeof PHASE];


export const MINIPHASE  = {
    MOVEMENT: 'movement',
    BATTLE: 'battle'
} as const;

export type MiniPhase  = typeof MINIPHASE [keyof typeof MINIPHASE];