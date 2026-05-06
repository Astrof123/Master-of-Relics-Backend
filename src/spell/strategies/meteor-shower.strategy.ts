import { GameForLogic } from "src/game-state/types/game-for-logic";
import { SpellStrategy } from "../types/strategy";
import { ARTIFACT_STATE, ArtifactGameState, LINE } from "src/game-state/types/game";
import { UseSkillData, UseSpellData } from "src/action/types/action-evens-data";
import { ANIMATION, AnimationData } from "src/action/types/animation";
import { Injectable } from "@nestjs/common";
import { ArtifactStateService } from "src/game-mechanics/artifact-state.service";
import { CombatService } from "src/game-mechanics/combat.service";
import { DAMAGE } from "src/game-mechanics/types/combat";
import { SPELL, Spell } from "../types/spell";
import { ArtifactService } from "src/artifact/artifact.service";

@Injectable()
export class MeteorShowerStrategy implements SpellStrategy {
    constructor(
        private readonly combatService: CombatService,
        private readonly artifactService: ArtifactService
    ) {}

    getSpellType(): Spell {
        return SPELL.METEOR_SHOWER;
    }

    execute(gameState: GameForLogic, data: UseSpellData, animations: AnimationData[], logParts: string[]) {
        const enemyArtifact = gameState.enemy.artifacts[data.targets[1][0]];
        const neighbors = this.artifactService.getNeighbors(gameState.enemy, enemyArtifact)

        if (neighbors.left !== null) {
            const damage = this.combatService.calculateDamage(neighbors.left, 20, DAMAGE.MAGIC);
            this.combatService.applyDamage(gameState, gameState.enemy, neighbors.left, damage, DAMAGE.MAGIC, logParts);

            animations.push({
                playerId: gameState.enemy.id,
                artifactGameId: enemyArtifact.id!,
                animation: ANIMATION.HIT,
                value: damage
            })
        }
        if (neighbors.right !== null) {
            const damage = this.combatService.calculateDamage(neighbors.right, 20, DAMAGE.MAGIC);
            this.combatService.applyDamage(gameState, gameState.enemy, neighbors.right, damage, DAMAGE.MAGIC, logParts);

            animations.push({
                playerId: gameState.enemy.id,
                artifactGameId: enemyArtifact.id!,
                animation: ANIMATION.HIT,
                value: damage
            })
        }
    }
}