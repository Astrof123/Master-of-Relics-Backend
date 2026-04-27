import { UseSkillData } from "src/action/types/action-evens-data";
import { AnimationData } from "src/action/types/animation";
import { ArtifactGameState } from "src/game-state/types/game";
import { GameForLogic } from "src/game-state/types/game-for-logic";
import { Skill } from "./skill";

export interface SkillStrategy {
    getSkillType(): Skill;
    execute(gameState: GameForLogic, artifact: ArtifactGameState, data: UseSkillData, animations: AnimationData[], logParts: string[]): void;
}