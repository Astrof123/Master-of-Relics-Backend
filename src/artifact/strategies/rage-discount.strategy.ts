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
import { EFFECT, EffectType } from "src/game-mechanics/types/effect";
import { EFFECTS } from "src/game-mechanics/constants/effects";
import { ResourceService } from "src/game-mechanics/resource.service";
import { LogHelper } from "src/action/helpers/logHelper";

@Injectable()
export class RageDiscountStrategy implements SkillStrategy {
    constructor(
        private readonly gameEffectsService: GameEffectsService,
        private readonly resourceService: ResourceService
    ) {}

    getSkillType(): Skill {
        return SKILL.RAGE_DISCOUNT;
    }

    execute(gameState: GameForLogic, player: Player, artifact: ArtifactGameState, data: UseSkillData, animations: AnimationData[], logParts: string[]) {
        if (this.gameEffectsService.countHeroEffect(player, EFFECT.RAGE_DISCOUNT) === 0 && this.gameEffectsService.countEffect(artifact, EFFECT.EXHAUSTION) === 0) {
            const effect: EffectType = EFFECTS[EFFECT.RAGE_DISCOUNT];
            effect.effectCasterGameId = artifact.id;
            
            this.gameEffectsService.applyHeroEffect(
                player, 
                effect, 
                logParts
            )
        }
    }

    death(gameState: GameForLogic, player: Player, artifact: ArtifactGameState, logParts: string[]) {
        this.gameEffectsService.removeHeroEffect(
            player,
            EFFECTS[EFFECT.RAGE_DISCOUNT], 
            logParts
        )
    }
}