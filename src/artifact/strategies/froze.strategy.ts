import { GameForLogic } from "src/game-state/types/game-for-logic";
import { SkillStrategy } from "../types/strategy";
import { ARTIFACT_STATE, ArtifactGameState, LINE } from "src/game-state/types/game";
import { UseSkillData } from "src/action/types/action-evens-data";
import { ANIMATION, AnimationData } from "src/action/types/animation";
import { Injectable } from "@nestjs/common";
import { Skill, SKILL } from "../types/skill";;
import { ArtifactStateService } from "src/game-mechanics/artifact-state.service";
import { CombatService } from "src/game-mechanics/combat.service";
import { DAMAGE } from "src/game-mechanics/types/combat";

@Injectable()
export class FrozeStrategy implements SkillStrategy {
    constructor(
        private readonly artifactStateService: ArtifactStateService,
        private readonly combatService: CombatService
    ) {}

    getActionType(): Skill {
        return SKILL.FROZE;
    }

    execute(gameState: GameForLogic, artifact: ArtifactGameState, data: UseSkillData, animations: AnimationData[]) {
        const enemyArtifact = gameState.enemy.artifacts[data.targets[1][0]];
        this.artifactStateService.applyState(gameState.enemy, enemyArtifact.id, ARTIFACT_STATE.ROOTED);
        const damage = this.combatService.calculateDamage(gameState.player, 5, DAMAGE.MAGIC);
        this.combatService.applyDamage(gameState.enemy, enemyArtifact.id, damage);

        animations.push({
            playerId: gameState.enemy.id,
            artifactGameId: enemyArtifact.id!,
            animation: ANIMATION.HIT,
            value: damage
        })
    }
}