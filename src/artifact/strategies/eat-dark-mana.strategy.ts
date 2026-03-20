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
import { RESOURCE } from "src/game-mechanics/types/resource";
import { ResourceService } from "src/game-mechanics/resource.service";

@Injectable()
export class EatDarkManaStrategy implements SkillStrategy {
    constructor(
        private readonly combatService: CombatService,
        private readonly resourceService: ResourceService
    ) {}

    getActionType(): Skill {
        return SKILL.EAT_DARK_MANA;
    }

    execute(gameState: GameForLogic, artifact: ArtifactGameState, data: UseSkillData, animations: AnimationData[]) {
        const heal = this.combatService.calculateHeal(gameState.player, artifact.id, 15);

        this.resourceService.decreaseResource(gameState.player, RESOURCE.DARK_MANA, 10)

        if (heal !== 0) {
            this.combatService.applyHealing(gameState.player, artifact.id, heal);
            animations.push({
                playerId: gameState.player.id,
                artifactGameId: artifact.id,
                animation: ANIMATION.HEAL,
                value: heal
            })
        }
    }
}