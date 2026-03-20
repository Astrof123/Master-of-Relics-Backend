import { GameForLogic } from "src/game-state/types/game-for-logic";
import { SkillStrategy } from "../types/strategy";
import { ArtifactGameState, LINE } from "src/game-state/types/game";
import { UseSkillData } from "src/action/types/action-evens-data";
import { AnimationData } from "src/action/types/animation";
import { Injectable } from "@nestjs/common";
import { Skill, SKILL } from "../types/skill";
import { randomInt } from "crypto";
import { MAX_COUNT_ARTIFACTS_ON_LINE } from "src/game-mechanics/constants/settings";
import { ArtifactService } from "../artifact.service";

@Injectable()
export class FearStrategy implements SkillStrategy {
    constructor(
        private readonly artifactService: ArtifactService
    ) {}

    getActionType(): Skill {
        return SKILL.FEAR;
    }

    execute(gameState: GameForLogic, artifact: ArtifactGameState, data: UseSkillData, animations: AnimationData[]) {
        const countOnLine = Object.values(gameState.enemy.artifacts).filter((art) => art.line === "back");
        const randomPos = randomInt(0, countOnLine.length + 1);

        this.artifactService.moveArtifact(
            randomPos, 
            gameState.enemy.artifacts[data.targets[1][0]],
            LINE.BACK,
            gameState.enemy.artifacts
        );
    }
}