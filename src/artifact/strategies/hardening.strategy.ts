import { GameForLogic } from "src/game-state/types/game-for-logic";
import { SkillStrategy } from "../types/strategy";
import { ArtifactGameState, Player } from "src/game-state/types/game";
import { UseSkillData } from "src/action/types/action-evens-data";
import { AnimationData } from "src/action/types/animation";
import { Injectable } from "@nestjs/common";
import { Skill, SKILL } from "../types/skill";;
import { GameEffectsService } from "src/game-mechanics/game-effects.service";
import { DISPELL_TYPE, EFFECT } from "src/game-mechanics/types/effect";
import { EFFECTS } from "src/game-mechanics/constants/effects";
import { ResourceService } from "src/game-mechanics/resource.service";
import { CombatService } from "src/game-mechanics/combat.service";

@Injectable()
export class HardeningStrategy implements SkillStrategy {
    constructor(

    ) {}

    getSkillType(): Skill {
        return SKILL.HARDENING;
    }

    execute(gameState: GameForLogic, player: Player, artifact: ArtifactGameState, data: UseSkillData, animations: AnimationData[], logParts: string[]) {
        const enemy = gameState.enemy.id === player.id ? player : gameState.enemy;
        if (data.targets[0].length > 0) {
            const allyArtifact = player.artifacts[data.targets[0][0]];
            allyArtifact.maxHp += 10;
            allyArtifact.currentHp = allyArtifact.currentHp > allyArtifact.maxHp ? allyArtifact.maxHp : allyArtifact.currentHp;
        }
        else if (data.targets[1].length > 0) {
            const enemyArtifact = enemy.artifacts[data.targets[1][0]];
            enemyArtifact.maxHp += 10;
            enemyArtifact.currentHp = enemyArtifact.currentHp > enemyArtifact.maxHp ? enemyArtifact.maxHp : enemyArtifact.currentHp;
        }
    }

    death(gameState: GameForLogic, player: Player, artifact: ArtifactGameState, logParts: string[]) {
    }
}