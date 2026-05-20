import { GameForLogic } from "src/game-state/types/game-for-logic";
import { SpellStrategy } from "../types/strategy";
import { ARTIFACT_STATE, ArtifactGameState, LINE, Player } from "src/game-state/types/game";
import { UseSkillData, UseSpellData } from "src/action/types/action-evens-data";
import { ANIMATION, AnimationData } from "src/action/types/animation";
import { Injectable } from "@nestjs/common";
import { ArtifactStateService } from "src/game-mechanics/artifact-state.service";
import { CombatService } from "src/game-mechanics/combat.service";
import { DAMAGE } from "src/game-mechanics/types/combat";
import { SPELL, Spell } from "../types/spell";
import { randomInt } from "crypto";

@Injectable()
export class ThunderStormStrategy implements SpellStrategy {
    constructor(
        private readonly combatService: CombatService
    ) {}

    getSpellType(): Spell {
        return SPELL.THUNDER_STORM;
    }

    execute(gameState: GameForLogic, player: Player, data: UseSpellData, animations: AnimationData[], logParts: string[]) {
        const enemy = gameState.enemy.id === player.id ? gameState.player : gameState.enemy;
        const artifacts = Object.values(enemy.artifacts);

        for (let i = artifacts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [artifacts[i], artifacts[j]] = [artifacts[j], artifacts[i]];
        }

        let k = 0;
        for (const artifact of artifacts) {
            if (k === 4) {
                break;
            }
            
            if (artifact.state === ARTIFACT_STATE.BREAKEN || artifact.state === ARTIFACT_STATE.DESTROYED) {
                continue
            }
            
            const damage = this.combatService.calculateDamage(artifact, 10, DAMAGE.MAGIC);
            this.combatService.applyDamage(gameState, enemy, null, artifact, damage, DAMAGE.MAGIC, logParts);

            animations.push({
                playerId: enemy.id,
                artifactGameId: artifact.id!,
                animation: ANIMATION.HIT,
                value: damage
            })

            k += 1
        }
    }
}