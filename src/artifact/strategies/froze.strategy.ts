import { GameForLogic } from "src/game-state/types/game-for-logic";
import { SkillStrategy } from "../types/strategy";
import { ARTIFACT_STATE, ArtifactGameState, LINE, Player } from "src/game-state/types/game";
import { UseSkillData } from "src/action/types/action-evens-data";
import { ANIMATION, AnimationData } from "src/action/types/animation";
import { Injectable } from "@nestjs/common";
import { Skill, SKILL } from "../types/skill";;
import { ArtifactStateService } from "src/game-mechanics/artifact-state.service";
import { CombatService } from "src/game-mechanics/combat.service";
import { DAMAGE } from "src/game-mechanics/types/combat";
import { LogHelper } from "src/action/helpers/logHelper";
import { ARTIFACTS } from "../constants/artifacts";

@Injectable()
export class FrozeStrategy implements SkillStrategy {
    constructor(
        private readonly artifactStateService: ArtifactStateService,
        private readonly combatService: CombatService
    ) {}

    getSkillType(): Skill {
        return SKILL.FROZE;
    }

    execute(gameState: GameForLogic, player: Player, artifact: ArtifactGameState, data: UseSkillData, animations: AnimationData[], logParts: string[]) {
        const enemy = gameState.enemy.id === player.id ? player : gameState.enemy;
        const enemyArtifact = enemy.artifacts[data.targets[1][0]];
        this.artifactStateService.applyState(enemyArtifact, ARTIFACT_STATE.ROOTED, logParts);
        const damage = this.combatService.calculateDamage(enemyArtifact, 5, DAMAGE.RANGED);
        this.combatService.applyDamage(gameState, enemy, artifact, enemyArtifact, damage, DAMAGE.RANGED, logParts);

        animations.push({
            playerId: enemy.id,
            artifactGameId: enemyArtifact.id!,
            animation: ANIMATION.HIT,
            value: damage
        })
    }

    death(gameState: GameForLogic, player: Player, artifact: ArtifactGameState, logParts: string[]) {
        
    }
}