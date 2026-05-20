import { GameForLogic } from "src/game-state/types/game-for-logic";
import { SkillStrategy } from "../types/strategy";
import { ArtifactGameState, Player } from "src/game-state/types/game";
import { UseSkillData } from "src/action/types/action-evens-data";
import { AnimationData } from "src/action/types/animation";
import { Injectable } from "@nestjs/common";
import { Skill, SKILL } from "../types/skill";;
import { GameEffectsService } from "src/game-mechanics/game-effects.service";
import { DISPELL_TYPE, EFFECT } from "src/game-mechanics/types/effect";
import { EFFECTS } from "src/game-mechanics/constants/effects";
import { ResourceService } from "src/game-mechanics/resource.service";

@Injectable()
export class ExhaustionStrategy implements SkillStrategy {
    constructor(
        private readonly gameEffectsService: GameEffectsService
    ) {}

    getSkillType(): Skill {
        return SKILL.EXHAUSTION;
    }

    execute(gameState: GameForLogic, player: Player, artifact: ArtifactGameState, data: UseSkillData, animations: AnimationData[], logParts: string[]) {
        const enemy = gameState.enemy.id === player.id ? gameState.player : gameState.enemy;
        const enemyArtifact = enemy.artifacts[data.targets[1][0]];
        
        this.gameEffectsService.applyEffect(
            enemyArtifact,
            EFFECTS[EFFECT.EXHAUSTION],
            logParts
        )

        for (const effect of enemyArtifact.effects) {
            if (effect.dispellType === DISPELL_TYPE.PASSIVE) {
                this.gameEffectsService.removeEffect(
                    enemyArtifact,
                    effect,
                    logParts
                )
            }
        }

        for (const effect of gameState.enemy.effects) {
            if (effect.dispellType === DISPELL_TYPE.PASSIVE && effect.effectCasterGameId === enemyArtifact.id) {
                this.gameEffectsService.removeHeroEffect(
                    gameState.enemy,
                    effect,
                    logParts
                )
            }
        }
    }

    death(gameState: GameForLogic, player: Player, artifact: ArtifactGameState, logParts: string[]) {
    }
}