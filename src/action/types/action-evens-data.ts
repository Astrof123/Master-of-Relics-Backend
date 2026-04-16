import { Skill } from "src/artifact/types/skill";
import { ExtraAction } from "./action";
import { ArtifactGameState, Line } from "src/game-state/types/game";

export interface UseFaceData {
    gameId: string;
    artifactGameId: string;
    attackTarget: string | null,
    healTarget: string | null
}

export interface UseSkillData {
    skillId: Skill;
    gameId: string;
    artifactGameId: string;
    targets: string[][];
}

export interface UseSpellData {
    spellId: Skill;
    gameId: string;
    targets: string[][];
}

export interface EndTurnData {
    gameId: string;
}

export interface EndRoundData {
    gameId: string;
}

export interface ExtraActionData {
    gameId: string;
    artifactGameId: string;
    type: ExtraAction;
    details: MoveArtifactDetails | null;
}


export interface ToggleReadyMovementData {
    gameId: string;
    artifactsWithNewPosition: Record<string, ArtifactGameState>;
}


export interface MoveArtifactDetails {
    newPosition: number;
    newLine: Line;
}