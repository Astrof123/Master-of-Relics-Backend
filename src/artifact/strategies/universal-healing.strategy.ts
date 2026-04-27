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
import { LogHelper } from "src/action/helpers/logHelper";

@Injectable()
export class UniversalHealingStrategy implements SkillStrategy {
    constructor(
        private readonly combatService: CombatService
    ) {}

    getSkillType(): Skill {
        return SKILL.UNIVERSAL_HEALING;
    }

    execute(gameState: GameForLogic, artifact: ArtifactGameState, data: UseSkillData, animations: AnimationData[], logParts: string[]) {
        Object.values(gameState.player.artifacts).forEach((art) => {
            const heal = this.combatService.calculateHeal(gameState.player, art.id, 15);

            if (heal !== 0) {
                this.combatService.applyHealing(gameState.player, art.id, heal, []);
                animations.push({
                    playerId: gameState.player.id,
                    artifactGameId: art.id,
                    animation: ANIMATION.HEAL,
                    value: heal
                })
            }
        })

        logParts.push(LogHelper.getHealAllLog(15));
    }
}