import { Skill } from "src/artifact/types/skill";
import { ExtraAction } from "./action";

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

export interface EndTurnData {
    gameId: string;
}

export interface EndRoundData {
    gameId: string;
}

export interface ExtraActionData {
    gameId: string;
    artifactGameId: string;
    type: ExtraAction
}