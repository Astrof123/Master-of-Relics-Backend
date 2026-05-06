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
import { randomInt } from "crypto";

@Injectable()
export class ThunderStormStrategy implements SpellStrategy {
    constructor(
        private readonly combatService: CombatService
    ) {}

    getSpellType(): Spell {
        return SPELL.THUNDER_STORM;
    }

    execute(gameState: GameForLogic, data: UseSpellData, animations: AnimationData[], logParts: string[]) {
        const countArtifacts = Object.values(gameState.enemy.artifacts).length;
        const artifacts = Object.values(gameState.enemy.artifacts);

        const attackedArtifacts: string[] = [];
        let i = 0
        while (i !== 4) {
            const randomNum = randomInt(0, countArtifacts);
            if (attackedArtifacts.includes(artifacts[randomNum].id)) {
                continue;
            }

            attackedArtifacts.push(artifacts[randomNum].id);

            const damage = this.combatService.calculateDamage(artifacts[randomNum], 10, DAMAGE.MAGIC);
            this.combatService.applyDamage(gameState, gameState.enemy, artifacts[randomNum], damage, DAMAGE.MAGIC, logParts);

            animations.push({
                playerId: gameState.enemy.id,
                artifactGameId: artifacts[randomNum].id!,
                animation: ANIMATION.HIT,
                value: damage
            })
            i += 1;
        }
    }
}