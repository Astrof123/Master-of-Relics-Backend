export const PHASE  = {
    PICK_HERO: 'pick_hero',
    DRAFT: 'draft',
    PLACEMENT: 'placement',
    BATTLE: 'battle',
    END: 'end'
} as const;

export type Phase  = typeof PHASE [keyof typeof PHASE];