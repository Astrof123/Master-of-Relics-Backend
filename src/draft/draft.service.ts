import { Injectable } from '@nestjs/common';
import { PickArtifactData } from './types/draft-evens-data';
import { GameStateService } from 'src/game-state/game-state.service';
import { RedisService } from 'src/redis/redis.service';
import { GameForClient } from 'src/game-state/types/game-for-client';
import { GAME_ERROR_CODE, GameException } from 'src/game-state/types/game-exceptions';
import { DRAFT_ERROR_CODE, DraftException } from './types/draft-exceptions';
import { GAMEPATH } from 'src/game-state/constants/game-redis-paths';
import { DRAFTPATH } from './constants/draft-redis-paths';
import { ARTIFACT_STATE, ArtifactGameState, LINE } from 'src/game-state/types/game';
import { v4 as uuidv4 } from 'uuid';
import { ARTIFACTS } from 'src/artifact/constants/artifacts';
import { PHASE, Phase } from 'src/game-state/types/phase';
import { DRAFT_COUNT_ARTIFACTS } from './constants/draft';
import { COMMON_ERROR_CODE, CommonException } from 'src/common/utils/error-handler';
import { MAX_COUNT_ARTIFACTS_ON_LINE } from 'src/game-mechanics/constants/settings';
import { PhaseService } from 'src/phase/phase.service';
import { GameForLogic } from 'src/game-state/types/game-for-logic';
import { ChainableCommander } from 'ioredis';
import { EffectType } from 'src/game-mechanics/types/effect';
import { EFFECTS } from 'src/game-mechanics/constants/effects';


@Injectable()
export class DraftService {
    constructor(
        private readonly gameStateService: GameStateService,
        private readonly redisService: RedisService,
        private readonly phaseService: PhaseService
    ) {}

    private async checkPickedArtifact(artifactId: string, gameState: GameForLogic) {
        if (!gameState.player.draft.deck.find(a => a.artifactId === artifactId)) {
            throw new DraftException(DRAFT_ERROR_CODE.ARTIFACT_NOT_FOUND);
        }
    }

    private async checkToggleReady(gameState: GameForLogic) {
        if (gameState.player.draft.pickedArtifact === null) {
            throw new DraftException(DRAFT_ERROR_CODE.NOT_PICKED_ARTIFACT);
        }
    }

    async pickArtifact(data: PickArtifactData, userId: number) {
        const key = this.gameStateService.getKeyGame(data.gameId);
        const gameState = await this.gameStateService.getGameForLogicById(data.gameId, userId);
        
        if (!gameState) {
            throw new GameException(GAME_ERROR_CODE.GAME_NOT_FOUND);
        }

        if (gameState.phase !== PHASE.DRAFT) {
            throw new DraftException(DRAFT_ERROR_CODE.PHASE_NOT_DRAFT);
        }

        await this.checkPickedArtifact(data.artifactId, gameState);

        const path = DRAFTPATH.getPickedArtifact(userId);
        await this.redisService.setJson<string>(key, path, data.artifactId);
    }

    async toggleReadyDraft(gameId: string, userId: number) {
        const key = this.gameStateService.getKeyGame(gameId);
        const maxRetries = 5;
        let retries = 0;
        let isSuccessEndMulti = false;

        while (retries < maxRetries && !isSuccessEndMulti) {
            await this.redisService.watch(key);
            
            try {
                let gameState = await this.gameStateService.getGameForLogicById(gameId, userId);
                
                if (!gameState) {
                    await this.redisService.unwatch();
                    throw new GameException(GAME_ERROR_CODE.GAME_NOT_FOUND);
                }

                if (gameState.phase !== PHASE.DRAFT) {
                    await this.redisService.unwatch();
                    throw new DraftException(DRAFT_ERROR_CODE.PHASE_NOT_DRAFT);
                }

                await this.checkToggleReady(gameState);

                const path = GAMEPATH.getPlayerReadyPath(userId);
                const isReadyPlayer = await this.redisService.getJson<boolean>(key, path);
                
                const multi = this.redisService.multi();
                
                this.redisService.jsonSetInTransaction(
                    multi,
                    key,
                    path,
                    !isReadyPlayer
                );

                await this.finishDraftOneArtifactInTransaction(
                    gameState, 
                    key, 
                    multi,
                    !isReadyPlayer
                );

                const results = await this.redisService.execMulti(multi);

                if (results === null) {
                    retries++;
                    continue;
                }

                isSuccessEndMulti = true;
            } 
            catch (error) {
                await this.redisService.unwatch();
                retries++;
                
                if (retries >= maxRetries) {
                    if (error instanceof GameException || error instanceof DraftException) {
                        throw error;
                    }
                    throw new CommonException(COMMON_ERROR_CODE.INTERNAL_SERVER_ERROR);
                }
            }
        }

        let gameState = await this.gameStateService.getGameForLogicById(gameId, userId);

        if (gameState === null) {
            throw new CommonException(COMMON_ERROR_CODE.INTERNAL_SERVER_ERROR);
        }
        
        if (isSuccessEndMulti && Object.values(gameState.player.artifacts).length === DRAFT_COUNT_ARTIFACTS) {
            gameState.phase = PHASE.BATTLE;
            this.phaseService.newRound(gameState);
            
            await this.gameStateService.saveGameForLogic(gameState, key);
        }
    }

    async finishDraftOneArtifactInTransaction(
        gameState: GameForLogic, 
        key: string,
        multi: ChainableCommander,
        playerReady: boolean
    ): Promise<boolean> {
        const pathReadyEnemy = GAMEPATH.getPlayerReadyPath(gameState.enemy.id);
        const pathPickedArtifactPlayer = DRAFTPATH.getPickedArtifact(gameState.player.id);
        const pathPickedArtifactEnemy = DRAFTPATH.getPickedArtifact(gameState.enemy.id);
        const pathPlayerArtifacts = GAMEPATH.getArtifactsPath(gameState.player.id);
        const pathEnemyArtifacts = GAMEPATH.getArtifactsPath(gameState.enemy.id);

        const isReadyEnemy = await this.redisService.getJson<boolean>(key, pathReadyEnemy);
        const pickedArtifactPlayer = await this.redisService.getJson<string>(key, pathPickedArtifactPlayer);
        const pickedArtifactEnemy = await this.redisService.getJson<string>(key, pathPickedArtifactEnemy);
        const playerArtifacts = await this.redisService.getJson<Record<string, ArtifactGameState>>(key, pathPlayerArtifacts);
        const enemyArtifacts = await this.redisService.getJson<Record<string, ArtifactGameState>>(key, pathEnemyArtifacts);

        if (playerArtifacts === null || enemyArtifacts === null) {
            throw new CommonException(COMMON_ERROR_CODE.INTERNAL_SERVER_ERROR);
        }

        if (playerReady && isReadyEnemy && pickedArtifactPlayer && pickedArtifactEnemy) {
            const artifactPlayerId = uuidv4();
            const artifactEnemyId = uuidv4();

            const playerArtifactEffects: EffectType[] = [];
            const enemyArtifactEffects: EffectType[] = [];

            ARTIFACTS[pickedArtifactPlayer].defaultEffects.forEach((effect) => {
                playerArtifactEffects.push({
                    id: effect,
                    name: EFFECTS[effect].name,
                    duration: EFFECTS[effect].duration,
                    type: EFFECTS[effect].type,
                    number: EFFECTS[effect].number,
                })
            })

            ARTIFACTS[pickedArtifactEnemy].defaultEffects.forEach((effect) => {
                enemyArtifactEffects.push({
                    id: effect,
                    name: EFFECTS[effect].name,
                    duration: EFFECTS[effect].duration,
                    type: EFFECTS[effect].type,
                    number: EFFECTS[effect].number,
                })
            })

            const artifactPlayer: ArtifactGameState = {
                id: artifactPlayerId,
                artifactId: pickedArtifactPlayer,
                face: ARTIFACTS[pickedArtifactPlayer].faces[0],
                state: ARTIFACT_STATE.READY_TO_USE,
                currentHp: ARTIFACTS[pickedArtifactPlayer].hp,
                maxHp: ARTIFACTS[pickedArtifactPlayer].hp,
                position: Object.values(playerArtifacts).length % MAX_COUNT_ARTIFACTS_ON_LINE,
                line: Object.values(playerArtifacts).length < MAX_COUNT_ARTIFACTS_ON_LINE ? LINE.BACK : LINE.FRONT,
                effects: playerArtifactEffects,
                availableActions: null
            };

            const artifactEnemy: ArtifactGameState = {
                id: artifactEnemyId,
                artifactId: pickedArtifactEnemy,
                face: ARTIFACTS[pickedArtifactEnemy].faces[0],
                state: ARTIFACT_STATE.READY_TO_USE,
                currentHp: ARTIFACTS[pickedArtifactEnemy].hp,
                maxHp: ARTIFACTS[pickedArtifactEnemy].hp,
                position: Object.values(enemyArtifacts).length % MAX_COUNT_ARTIFACTS_ON_LINE,
                line: Object.values(enemyArtifacts).length < MAX_COUNT_ARTIFACTS_ON_LINE ? LINE.BACK : LINE.FRONT,
                effects: enemyArtifactEffects,
                availableActions: null
            };

            this.redisService.jsonSetInTransaction(
                multi,
                key,
                DRAFTPATH.getArtifactPath(gameState.player.id, artifactPlayerId),
                artifactPlayer
            );

            this.redisService.jsonSetInTransaction(
                multi,
                key,
                DRAFTPATH.getArtifactPath(gameState.enemy.id, artifactEnemyId),
                artifactEnemy
            );

            this.redisService.jsonSetInTransaction(
                multi,
                key,
                DRAFTPATH.getPickedArtifact(gameState.player.id),
                null
            );

            this.redisService.jsonSetInTransaction(
                multi,
                key,
                DRAFTPATH.getPickedArtifact(gameState.enemy.id),
                null
            );

            this.redisService.jsonSetInTransaction(
                multi,
                key,
                GAMEPATH.getPlayerReadyPath(gameState.player.id),
                false
            );

            this.redisService.jsonSetInTransaction(
                multi,
                key,
                GAMEPATH.getPlayerReadyPath(gameState.enemy.id),
                false
            );

            return true;
        }

        return false;
    }

    async finishDraft(gameState: GameForLogic, key: string) {
        gameState.phase = PHASE.BATTLE;
        this.phaseService.newRound(gameState);
    }
}
