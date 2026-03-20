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
import { GameEffectsService } from "src/game-mechanics/game-effects.service";
import { EFFECT } from "src/game-mechanics/types/effect";
import { EFFECTS } from "src/game-mechanics/constants/effects";
import { ResourceService } from "src/game-mechanics/resource.service";

@Injectable()
export class SwiftStrategy implements SkillStrategy {
    constructor(
        private readonly gameEffectsService: GameEffectsService,
        private readonly resourceService: ResourceService
    ) {}

    getActionType(): Skill {
        return SKILL.SWIFT;
    }

    execute(gameState: GameForLogic, artifact: ArtifactGameState, data: UseSkillData, animations: AnimationData[]) {
        this.resourceService.addResource(gameState.player, RESOURCE.AGILITY, 45)

        this.gameEffectsService.applyEffect(gameState.player, artifact.id, {
            id: EFFECT.USED_SKILL_CHARGES,
            name: EFFECTS[EFFECT.USED_SKILL_CHARGES].name,
            duration: EFFECTS[EFFECT.USED_SKILL_CHARGES].duration,
            number: EFFECTS[EFFECT.USED_SKILL_CHARGES].number,
            type: "negative"
        })
    }
}