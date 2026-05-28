import { Injectable } from '@nestjs/common';
import { PickArtifactData } from './types/draft-evens-data';
import { GameStateService } from 'src/game-state/game-state.service';
import { RedisService } from 'src/redis/redis.service';
import { GameForClient } from 'src/game-state/types/game-for-client';
import {
    GAME_ERROR_CODE,
    GameException,
} from 'src/game-state/types/game-exceptions';
import { DRAFT_ERROR_CODE, DraftException } from './types/draft-exceptions';
import { GAMEPATH } from 'src/game-state/constants/game-redis-paths';
import { DRAFTPATH } from './constants/draft-redis-paths';
import {
    ARTIFACT_STATE,
    ArtifactGameState,
    LINE,
    Player,
} from 'src/game-state/types/game';
import { v4 as uuidv4 } from 'uuid';
import { ARTIFACTS } from 'src/artifact/constants/artifacts';
import { PHASE, Phase } from 'src/game-state/types/phase';
import { DRAFT_COUNT_ARTIFACTS } from './constants/draft';
import {
    COMMON_ERROR_CODE,
    CommonException,
} from 'src/common/utils/error-handler';
import { MAX_COUNT_ARTIFACTS_ON_LINE } from 'src/game-mechanics/constants/settings';
import { PhaseService } from 'src/phase/phase.service';
import { GameForLogic } from 'src/game-state/types/game-for-logic';
import { ChainableCommander } from 'ioredis';
import { EffectType } from 'src/game-mechanics/types/effect';
import { EFFECTS } from 'src/game-mechanics/constants/effects';
import { SKILLS } from 'src/artifact/constants/skills';
import { GameTimerService } from 'src/game-state/game-timer.service';
import { TIMER_TYPE } from 'src/game-state/types/timer';
import { Artifact } from 'src/artifact/types/artifact';
import { randomInt } from 'crypto';
import { ArtifactService } from 'src/artifact/artifact.service';

@Injectable()
export class DraftService {
    constructor(
        private readonly gameStateService: GameStateService,
        private readonly redisService: RedisService,
        private readonly phaseService: PhaseService,
        private readonly gameTimerService: GameTimerService,
        private readonly artifactService: ArtifactService,
    ) {}

    private async checkPickedArtifact(
        artifactId: string,
        gameState: GameForLogic,
    ) {
        if (
            !gameState.player.draft.deck.find(
                (a) => a.artifactId === artifactId,
            )
        ) {
            throw new DraftException(DRAFT_ERROR_CODE.ARTIFACT_NOT_FOUND);
        }
    }

    private async checkToggleReady(gameState: GameForLogic) {
        if (gameState.player.draft.pickedArtifact === null) {
            throw new DraftException(DRAFT_ERROR_CODE.NOT_PICKED_ARTIFACT);
        }
    }

    async pickArtifact(data: PickArtifactData, userId: string) {
        const key = this.gameStateService.getKeyGame(data.gameId);
        const gameState = await this.gameStateService.getGameForLogicById(
            data.gameId,
            userId,
        );

        if (!gameState) {
            throw new GameException(GAME_ERROR_CODE.GAME_NOT_FOUND);
        }

        if (gameState.phase !== PHASE.DRAFT) {
            throw new DraftException(DRAFT_ERROR_CODE.PHASE_NOT_DRAFT);
        }

        if (gameState.end !== null) {
            throw new DraftException(DRAFT_ERROR_CODE.GAME_OVER);
        }

        await this.checkPickedArtifact(data.artifactId, gameState);

        const path = DRAFTPATH.getPickedArtifact(userId);
        await this.redisService.setJson<string>(key, path, data.artifactId);
    }

    async toggleReadyDraft(gameId: string, userId: string) {
        const key = this.gameStateService.getKeyGame(gameId);
        let retries = 0;

        while (retries < 5) {
            await this.redisService.watch(key);

            try {
                const gameState = await this.gameStateService.getGameForLogicById(gameId, userId);
                );

                if (!gameState) {
                    await this.redisService.unwatch();
                    throw new GameException(GAME_ERROR_CODE.GAME_NOT_FOUND);
                }

                if (gameState.phase !== PHASE.DRAFT) {
                    await this.redisService.unwatch();
                    throw new DraftException(DRAFT_ERROR_CODE.PHASE_NOT_DRAFT);
                }

                if (gameState.end !== null) {
                    throw new DraftException(DRAFT_ERROR_CODE.GAME_OVER);
                }

                await this.checkToggleReady(gameState);

                const updatedGameState = this.cloneGameState(gameState);
                updatedGameState.player.isReady =
                    !updatedGameState.player.isReady;

                const draftFinished =
                    this.applyFinishDraftIfNeeded(updatedGameState);

                const allArtifactsCollected =
                    draftFinished &&
                    Object.keys(updatedGameState.player.artifacts).length ===
                        DRAFT_COUNT_ARTIFACTS;

                if (allArtifactsCollected) {
                    updatedGameState.phase = PHASE.BATTLE;
                    await this.phaseService.newRound(updatedGameState);
                }

                const multi = this.redisService.multi();
                await this.gameStateService.saveGameForLogicInTransaction(
                    updatedGameState,
                    key,
                    multi,
                );

                const results = await this.redisService.execMulti(multi);
                if (results === null) {
                    retries++;
                    continue;
                }

                if (draftFinished && gameState.constants.timerDraft) {
                    await this.gameTimerService.startTimer(
                        gameId,
                        TIMER_TYPE.DRAFT,
                        gameState.constants.timerDraft,
                    );
                }

                return;
            } catch (error) {
                await this.redisService.unwatch();
                retries++;
                if (retries >= 5) throw error;
            }
        }
    }

    async autoFinishDraft(gameId: string, userId: string) {
        const key = this.gameStateService.getKeyGame(gameId);
        let retries = 0;

        while (retries < 5) {
            await this.redisService.watch(key);

            try {
                const gameState = await this.gameStateService.getGameForLogicById(gameId, userId);
                );

                if (!gameState) {
                    await this.redisService.unwatch();
                    throw new GameException(GAME_ERROR_CODE.GAME_NOT_FOUND);
                }

                if (gameState.phase !== PHASE.DRAFT) {
                    await this.redisService.unwatch();
                    return;
                }

                if (gameState.end !== null) {
                    await this.redisService.unwatch();
                    return;
                }

                if (gameState.player.isReady) {
                    await this.redisService.unwatch();
                    return;
                }

                let autoPickArtifact;
                if (!gameState.player.draft.pickedArtifact) {
                    const randomArtifact = randomInt(
                        0,
                        gameState.player.draft.deck.length,
                    );
                    autoPickArtifact =
                        gameState.player.draft.deck[randomArtifact]?.artifactId;
                } else {
                    autoPickArtifact =
                        gameState.player.draft.deck[
                            gameState.player.draft.pickedArtifact
                        ]?.artifactId;
                }

                const updatedGameState = this.cloneGameState(gameState);
                updatedGameState.player.draft.pickedArtifact = autoPickArtifact;
                updatedGameState.player.isReady = true;
                const draftFinished =
                    this.applyFinishDraftIfNeeded(updatedGameState);

                const allArtifactsCollected =
                    draftFinished &&
                    Object.keys(updatedGameState.player.artifacts).length ===
                        DRAFT_COUNT_ARTIFACTS;

                if (allArtifactsCollected) {
                    updatedGameState.phase = PHASE.BATTLE;
                    await this.phaseService.newRound(updatedGameState);
                }

                const multi = this.redisService.multi();
                await this.gameStateService.saveGameForLogicInTransaction(
                    updatedGameState,
                    key,
                    multi,
                );

                const results = await this.redisService.execMulti(multi);
                if (results === null) {
                    retries++;
                    continue;
                }

                if (draftFinished && gameState.constants.timerDraft) {
                    await this.gameTimerService.startTimer(
                        gameId,
                        TIMER_TYPE.DRAFT,
                        gameState.constants.timerDraft,
                    );
                }
                return;
            } catch (error) {
                await this.redisService.unwatch();
                retries++;
                if (retries >= 5) throw error;
            }
        }
    }

    private applyFinishDraftIfNeeded(gameState: GameForLogic): boolean {
        let isReadyEnemy = gameState.enemy.isReady;
        const pickedArtifactPlayer = gameState.player.draft.pickedArtifact;

        let pickedArtifactEnemy = gameState.enemy.draft.pickedArtifact;
        if (gameState.enemy.isBot) {
            const artifactNum = Object.values(
                gameState.player.artifacts,
            ).length;
            pickedArtifactEnemy =
                gameState.enemy.draft.deck[artifactNum].artifactId;
            isReadyEnemy = true;
        }
        const playerArtifacts = gameState.player.artifacts;
        const enemyArtifacts = gameState.enemy.artifacts;

        if (playerArtifacts === null || enemyArtifacts === null) {
            throw new CommonException(COMMON_ERROR_CODE.INTERNAL_SERVER_ERROR);
        }

        if (
            gameState.player.isReady &&
            isReadyEnemy &&
            pickedArtifactPlayer &&
            pickedArtifactEnemy
        ) {
            const artifactPlayer = this.artifactService.createArtifactState(
                gameState.player.artifacts,
                pickedArtifactPlayer,
            );
            const artifactEnemy = this.artifactService.createArtifactState(
                gameState.enemy.artifacts,
                pickedArtifactEnemy,
            );

            gameState.player.artifacts[artifactPlayer.id] = artifactPlayer;
            gameState.enemy.artifacts[artifactEnemy.id] = artifactEnemy;

            gameState.player.draft.pickedArtifact = null;
            gameState.enemy.draft.pickedArtifact = null;

            gameState.player.isReady = false;
            gameState.enemy.isReady = false;

            return true;
        }

        return false;
    }

    private cloneGameState(gameState: GameForLogic): GameForLogic {
        return JSON.parse(JSON.stringify(gameState));
    }
}
