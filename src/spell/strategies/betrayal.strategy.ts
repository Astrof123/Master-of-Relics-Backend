import { GameForLogic } from "src/game-state/types/game-for-logic";
import { SpellStrategy } from "../types/strategy";
import { UseSkillData, UseSpellData } from "src/action/types/action-evens-data";
import { ANIMATION, AnimationData } from "src/action/types/animation";
import { Injectable } from "@nestjs/common";
import { ArtifactStateService } from "src/game-mechanics/artifact-state.service";
import { CombatService } from "src/game-mechanics/combat.service";
import { DAMAGE } from "src/game-mechanics/types/combat";
import { SPELL, Spell } from "../types/spell";
import { LogHelper } from "src/action/helpers/logHelper";
import { ARTIFACTS } from "src/artifact/constants/artifacts";
import { ARTIFACT_STATE, Player } from "src/game-state/types/game";
import { FACES } from "src/game-mechanics/constants/faces";
import { TARGET_RESTRICTION, TargetRestriction } from "src/action/types/restriction";
import { ArtifactService } from "src/artifact/artifact.service";
import { randomInt } from "crypto";

@Injectable()
export class BetrayalStrategy implements SpellStrategy {
    constructor(
        private readonly combatService: CombatService,
        private readonly artifactService: ArtifactService
    ) {}

    getSpellType(): Spell {
        return SPELL.BETRAYAL;
    }

    execute(gameState: GameForLogic, player: Player, data: UseSpellData, animations: AnimationData[], logParts: string[]) {
        const enemy = gameState.enemy.id === player.id ? player : gameState.enemy;
        const enemyArtifact = enemy.artifacts[data.targets[1][0]];
        const faceData = FACES[enemyArtifact.face];
        const damageType = faceData.sword > 0 ? DAMAGE.MELEE : DAMAGE.RANGED;
        const neighbors = this.artifactService.getNeighbors(enemy, enemyArtifact);
        const randomNum = randomInt(0, 2);
        let randomEnemy = randomNum === 0 ? neighbors.left : neighbors.right;
        if (randomEnemy === null || randomEnemy.state === ARTIFACT_STATE.BREAKEN || randomEnemy.state === ARTIFACT_STATE.DESTROYED) {
            randomEnemy = randomNum === 0 ? neighbors.right : neighbors.left;
        }

        if (randomEnemy && randomEnemy.state !== ARTIFACT_STATE.BREAKEN && randomEnemy.state !== ARTIFACT_STATE.DESTROYED) {
            const damage = this.combatService.calculateFaceDamage(
                player, 
                enemy, 
                enemyArtifact,
                randomEnemy,
                damageType
            );
            
            this.combatService.applyDamage(gameState, enemy, enemyArtifact, randomEnemy, damage, damageType, logParts);
            
            animations.push({
                playerId: enemy.id,
                artifactGameId: randomEnemy.id,
                animation: ANIMATION.HIT,
                value: damage
            });
        }
    }
}