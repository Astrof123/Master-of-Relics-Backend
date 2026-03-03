import { EffectType } from "src/effects/types/effect";
import { Face, FACE } from "src/game-state/types/game";

export interface Artifact {
    id: number;
    name: string;
    hp: number;
    faces: Face[];
    skillCost: number;
    defaultEffects: EffectType[];
}



