import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { ARTIFACT_STATE, ArtifactGameState, Player } from "src/game-state/types/game";
import { EFFECT, Effect, EFFECT_DURATION, EffectType } from "./types/effect";
import { LogHelper } from "src/action/helpers/logHelper";
import { ARTIFACTS } from "src/artifact/constants/artifacts";
import { GameForLogic } from "src/game-state/types/game-for-logic";
import { SKILL } from "src/artifact/types/skill";
import { SKILLS } from "src/artifact/constants/skills";
import { RESTRICTION } from "src/action/types/restriction";
import { SkillsStrategyFactory } from "src/artifact/skills.factory";
import { UseSkillData } from "src/action/types/action-evens-data";
import { EFFECTS } from "./constants/effects";
import { ArtifactService } from "src/artifact/artifact.service";

@Injectable()
export class GameEffectsService {
    constructor(
        @Inject(forwardRef(() => SkillsStrategyFactory))
        private readonly skillsFactory: SkillsStrategyFactory,
        @Inject(forwardRef(() => ArtifactService))
        private readonly artifactService: ArtifactService
    ) {}

    removeEffect(artifactState: ArtifactGameState, effect: EffectType, logParts: string[]) {
        const foundEffect = artifactState.effects.find(e => e.id === effect.id);
        if (foundEffect) {
            const index = artifactState.effects.indexOf(foundEffect);
            if (index !== -1) {
                artifactState.effects.splice(index, 1);
                logParts.push(LogHelper.getRemoveEffectLog(effect, ARTIFACTS[artifactState.artifactId].name))
            }
        }
    }

    removeHeroEffect(player: Player, effect: EffectType, logParts: string[]) {
        const index = player.effects.indexOf(effect);
        if (index !== -1) {
            player.effects.splice(index, 1);
            logParts.push(LogHelper.getRemoveHeroEffectLog(effect, player.name))
        }
        
    }

    applyEffect(artifactState: ArtifactGameState, effect: EffectType, logParts: string[]) {
        artifactState.effects.push(effect);

        logParts.push(LogHelper.getAppliedEffectLog(effect, ARTIFACTS[artifactState.artifactId].name))
    }

    applyHeroEffect(player: Player, effect: EffectType, logParts: string[]) {
        player.effects.push(effect)

        logParts.push(LogHelper.getAppliedHeroEffectLog(effect, player.name))
    }

    getEffect(artifactState: ArtifactGameState, effect: Effect) {
        return artifactState.effects.find(e => e.id === effect);
    }

    getHeroEffects(player: Player, effect: Effect) {
        return player.effects.filter(e => e.id === effect);
    }

    increaseEffect(artifactState: ArtifactGameState, effect: Effect, logParts: string[]) {
        const findedEffect = artifactState.effects.find(e => e.id === effect);
        if (findedEffect && findedEffect.number !== null) {
            findedEffect.number += 1;
            logParts.push(LogHelper.getAppliedEffectLog(EFFECTS[effect], ARTIFACTS[artifactState.artifactId].name))
        }
        else if (!findedEffect) {
            this.applyEffect(artifactState, EFFECTS[effect], logParts)
        }
    }

    countHeroEffect(player: Player, effect: Effect) {
        return player.effects.filter(e => e.id === effect).length;
    }

    countEffect(artifactState: ArtifactGameState, effect: Effect) {
        const check = artifactState.effects.filter(e => e.id === effect);
        return check.length;
    }

    calculateNewStateEffects(gameState: GameForLogic, player: Player, enemy: Player) {
        for (const [key, artifact] of Object.entries(player.artifacts)) {
            if (artifact.state === ARTIFACT_STATE.BREAKEN) {
                continue;
            }

            if (ARTIFACTS[artifact.artifactId].skills !== null) {
                for (const skill of ARTIFACTS[artifact.artifactId].skills!) {
                    if (SKILLS[skill].restrictions.includes(RESTRICTION.PROCESS_ONLY_IN_NEW_STATE)) {
                        const data: UseSkillData = {
                            skillId: skill,
                            gameId: gameState.id,
                            artifactGameId: artifact.id,
                            targets: [[], []]
                        }

                        const strategy = this.skillsFactory.getStrategy(skill);
                        strategy.execute(gameState, player, artifact, data, [], []);
                    }
                }
            }
        }

        for (const [key, artifact] of Object.entries(enemy.artifacts)) {
            if (artifact.state === ARTIFACT_STATE.BREAKEN) {
                continue;
            }

            if (ARTIFACTS[artifact.artifactId].skills !== null) {
                for (const skill of ARTIFACTS[artifact.artifactId].skills!) {
                    if (SKILLS[skill].restrictions.includes(RESTRICTION.PROCESS_ONLY_IN_NEW_STATE)) {
                        const data: UseSkillData = {
                            skillId: skill,
                            gameId: gameState.id,
                            artifactGameId: artifact.id,
                            targets: [[], []]
                        }

                        const strategy = this.skillsFactory.getStrategy(skill);
                        strategy.execute(gameState, enemy, artifact, data, [], []);
                    }
                }
            }
        }
    }

    async checkNewRoundEffects(gameState: GameForLogic) {
        for (const [key, artifact] of Object.entries(gameState.player.artifacts)) {
            if (this.countEffect(artifact, EFFECT.LIVE_FOR_ROUND) > 0) {
                this.artifactService.destroyArtifact(gameState.player, artifact, [])
                continue;
            }
            if (this.countEffect(artifact, EFFECT.COPY) > 0) {
                this.artifactService.destroyArtifact(gameState.player, artifact, [])
                continue;
            }

            for (const effect of artifact.effects) {
                if (effect.duration === EFFECT_DURATION.CURRENT_ROUND) {
                    this.removeEffect(artifact, effect, []);
                }
            }
        }

        for (const [key, artifact] of Object.entries(gameState.enemy.artifacts)) {
            if (this.countEffect(artifact, EFFECT.LIVE_FOR_ROUND) > 0) {
                this.artifactService.destroyArtifact(gameState.enemy, artifact, [])
                continue;
            }
            if (this.countEffect(artifact, EFFECT.COPY) > 0) {
                this.artifactService.destroyArtifact(gameState.enemy, artifact, [])
                continue;
            }

            for (const effect of artifact.effects) {
                if (effect.duration === EFFECT_DURATION.CURRENT_ROUND) {
                    this.removeEffect(artifact, effect, []);
                }
            }
        }

        for (const effect of gameState.player.effects) {
            if (effect.duration === EFFECT_DURATION.CURRENT_ROUND) {
                this.removeHeroEffect(gameState.player, effect, []);
            }
        }

        for (const effect of gameState.enemy.effects) {
            if (effect.duration === EFFECT_DURATION.CURRENT_ROUND) {
                this.removeHeroEffect(gameState.enemy, effect, []);
            }
        }
    }
}