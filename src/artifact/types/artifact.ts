import { Face } from "src/game-mechanics/types/face";
import { Skill } from "./skill";
import { Effect, EffectType } from "src/game-mechanics/types/effect";

export interface ArtifactDataType {
    id: string;
    name: string;
    hp: number;
    faces: Face[];
    skills: Skill[] | null;
    defaultEffects: Effect[];
    isForSale: boolean;
    price: number;
}

export const ARTIFACT  = {
    INTIMIDATOR: 'intimidator',
    ARCANE_SHIELD: 'arcane_shield',
    FROST_BOW: 'frost_bow',
    REGENERATION_POTION: 'regeneration_potion',
    SWIFT_BOOTS: 'swift_boots',
};

export type Artifact  = typeof ARTIFACT [keyof typeof ARTIFACT];