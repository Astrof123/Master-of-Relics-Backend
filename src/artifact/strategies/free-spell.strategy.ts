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
import { RESOURCE } from "src/game-mechanics/types/resource";
import { GameEffectsService } from "src/game-mechanics/game-effects.service";
import { EFFECT } from "src/game-mechanics/types/effect";
import { EFFECTS } from "src/game-mechanics/constants/effects";
import { ResourceService } from "src/game-mechanics/resource.service";
import { LogHelper } from "src/action/helpers/logHelper";

@Injectable()
export class FreeSpellStrategy implements SkillStrategy {
    constructor(
        private readonly gameEffectsService: GameEffectsService,
        private readonly resourceService: ResourceService
    ) {}

    getSkillType(): Skill {
        return SKILL.FREE_SPELL;
    }

    execute(gameState: GameForLogic, player: Player, artifact: ArtifactGameState, data: UseSkillData, animations: AnimationData[], logParts: string[]) {
        this.gameEffectsService.applyHeroEffect(
            player, 
            EFFECTS[EFFECT.FREE_SPELL], 
            logParts
        )
    }

    death(gameState: GameForLogic, player: Player, artifact: ArtifactGameState, logParts: string[]) {

    }
}