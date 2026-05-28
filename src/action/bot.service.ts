import { Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';
import { RESOURCE } from 'src/game-mechanics/types/resource';
import { GameForLogic } from 'src/game-state/types/game-for-logic';
import { ActionResolverService } from './action-resolver.service';
import { PhaseService } from 'src/phase/phase.service';
import { UseFaceData, UseSkillData } from './types/action-evens-data';
import { AnimationData } from './types/animation';
import {
    ARTIFACT_STATE,
    ArtifactGameState,
    Player,
} from 'src/game-state/types/game';

@Injectable()
export class BotService {
    constructor(
        private readonly actionResolverService: ActionResolverService,
        private readonly phaseService: PhaseService,
    ) {}

    async doRandomAction(gameState: GameForLogic, animations: AnimationData[]) {
        const botState = gameState.enemy;
        const artifactsCount = Object.values(botState.artifacts).length;
        const usedArtifacts: number[] = [];
        let attempt = 0;

        while (attempt < artifactsCount) {
            const randomArtifactNum = randomInt(0, artifactsCount);

            if (usedArtifacts.includes(randomArtifactNum)) {
                continue;
            }

            const randomArtifact = Object.values(botState.artifacts)[
                randomArtifactNum
            ];

            if (randomArtifact.state !== ARTIFACT_STATE.READY_TO_USE) {
                attempt += 1;
                usedArtifacts.push(randomArtifactNum);
                continue;
            }

            const skillDone = this.doSkillAction(
                gameState,
                botState,
                randomArtifact,
                animations,
            );

            if (skillDone) {
                break;
            }

            const faceDone = this.doFaceAction(
                gameState,
                botState,
                randomArtifact,
                animations,
            );
            if (faceDone) {
                break;
            }

            attempt += 1;
            usedArtifacts.push(randomArtifactNum);
        }

        if (attempt === artifactsCount) {
            await this.actionResolverService.endRoundResolve(
                gameState,
                botState,
            );
            return;
        }

        await this.actionResolverService.endTurnResolve(gameState, botState);
    }

    doSkillAction(
        gameState: GameForLogic,
        botState: Player,
        randomArtifact: ArtifactGameState,
        animations: AnimationData[],
    ): boolean {
        if (
            randomArtifact.skillCost === null ||
            randomArtifact.availableActions === null
        ) {
            return false;
        }

        if (botState.resources[RESOURCE.RAGE] >= randomArtifact.skillCost) {
            if (randomArtifact.availableActions.skills.length > 0) {
                const targets: string[][] = [[], []];

                for (
                    let i = 0;
                    i <
                    randomArtifact.availableActions.skills[0].countTargetAllies;
                    i++
                ) {
                    targets[0].push(
                        randomArtifact.availableActions.skills[0]
                            .possibleTargets[0][i],
                    );
                }
                for (
                    let i = 0;
                    i <
                    randomArtifact.availableActions.skills[0].countTargetEnemy;
                    i++
                ) {
                    targets[1].push(
                        randomArtifact.availableActions.skills[0]
                            .possibleTargets[1][i],
                    );
                }

                const useSkillData: UseSkillData = {
                    skillId: randomArtifact.availableActions.skills[0].id,
                    artifactGameId: randomArtifact.id,
                    gameId: gameState.id,
                    targets: targets,
                };

                this.actionResolverService.useSkillResolve(
                    gameState,
                    botState,
                    randomArtifact,
                    useSkillData,
                    animations,
                );

                return true;
            }
        }

        return false;
    }

    doFaceAction(
        gameState: GameForLogic,
        botState: Player,
        randomArtifact: ArtifactGameState,
        animations: AnimationData[],
    ): boolean {
        if (
            randomArtifact.availableActions === null ||
            randomArtifact.availableActions.face === null
        ) {
            return false;
        }

        const targets: string[][] = [[], []];

        if (randomArtifact.availableActions.face.healTargets) {
            for (
                let i = 0;
                i < randomArtifact.availableActions.face.healTargets.length;
                i++
            ) {
                targets[0].push(
                    randomArtifact.availableActions.face.healTargets[i],
                );
            }
        }
        if (randomArtifact.availableActions.face.attackTargets) {
            for (
                let i = 0;
                i < randomArtifact.availableActions.face.attackTargets.length;
                i++
            ) {
                targets[1].push(
                    randomArtifact.availableActions.face.attackTargets[i],
                );
            }
        }

        const useFaceData: UseFaceData = {
            artifactGameId: randomArtifact.id,
            gameId: gameState.id,
            attackTarget: targets[1][0],
            healTarget: targets[0][0],
        };

        this.actionResolverService.useFaceResolve(
            gameState,
            botState,
            randomArtifact,
            useFaceData,
            animations,
        );

        return true;
    }
}
