import { GameForLogic } from "src/game-state/types/game-for-logic";
import { SpellStrategy } from "../types/strategy";
import { UseSpellData } from "src/action/types/action-evens-data";
import { AnimationData } from "src/action/types/animation";
import { Injectable } from "@nestjs/common";
import { ArtifactStateService } from "src/game-mechanics/artifact-state.service";
import { CombatService } from "src/game-mechanics/combat.service";
import { SPELL, Spell } from "../types/spell";
import { ARTIFACT_STATE, Player } from "src/game-state/types/game";

@Injectable()
export class ColdTouchStrategy implements SpellStrategy {
    constructor(
        private readonly combatService: CombatService,
        private readonly artifactStateService: ArtifactStateService
    ) {}

    getSpellType(): Spell {
        return SPELL.COLD_TOUCH;
    }

    execute(gameState: GameForLogic, player: Player, data: UseSpellData, animations: AnimationData[], logParts: string[]) {
        const enemy = gameState.enemy.id === player.id ? player : gameState.enemy;
        const artifacts = Object.values(enemy.artifacts);

        for (let i = artifacts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [artifacts[i], artifacts[j]] = [artifacts[j], artifacts[i]];
        }

        let k = 0;
        for (const artifact of artifacts) {
            if (k === 2) {
                break;
            }
            
            if (artifact.state === ARTIFACT_STATE.COOLDOWN || artifact.state === ARTIFACT_STATE.READY_TO_USE || artifact.state === ARTIFACT_STATE.DREAM) {
                this.artifactStateService.applyState(artifact, ARTIFACT_STATE.ROOTED, logParts);
                k += 1
            }
        }
    }
}