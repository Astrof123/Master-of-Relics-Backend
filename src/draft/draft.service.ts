import { Injectable } from '@nestjs/common';
import { PickArtifactData } from './types/draft-evens-data';
import { GameStateService } from 'src/game-state/game-state.service';
import { RedisService } from 'src/redis/redis.service';
import { GameForClient } from 'src/game-state/types/game-for-client';
import { GAME_ERROR_CODE, GameException } from 'src/game-state/types/game-exceptions';
import { DRAFT_ERROR_CODE, DraftException } from './types/draft-exceptions';
import { GAMEPATH } from 'src/game-state/types/game-redis-paths';
import { DRAFTPATH } from './types/draft-redis-paths';
import { ARTIFACT_STATE, ArtifactGameState, LINE } from 'src/game-state/types/game';
import { v4 as uuidv4 } from 'uuid';
import { ARTIFACTS } from 'src/artifact/constants/artifacts';
import { PHASE, Phase } from 'src/game-state/types/phase';
import { DRAFT_COUNT_ARTIFACTS } from './constants/draft';
import { COMMON_ERROR_CODE, CommonException } from 'src/common/utils/error-handler';


@Injectable()
export class DraftService {
    constructor(
        private readonly gameStateService: GameStateService,
        private readonly redisService: RedisService,
    ) {}

    private async checkPickedArtifact(artifactId: number, gameState: GameForClient) {
        if (!gameState.player.draft.deck.includes(artifactId)) {
            throw new DraftException(DRAFT_ERROR_CODE.ARTIFACT_NOT_FOUND);
        }
    }

    private async checkToggleReady(gameState: GameForClient) {
        if (gameState.player.draft.pickedArtifact === null) {
            throw new DraftException(DRAFT_ERROR_CODE.NOT_PICKED_ARTIFACT);
        }
    }

    async pickArtifact(data: PickArtifactData, userId: number) {
        const key = this.gameStateService.getKeyGame(data.gameId);
        const gameState = await this.gameStateService.getGameForClientById(data.gameId, userId);
        
        if (!gameState) {
            throw new GameException(GAME_ERROR_CODE.GAME_NOT_FOUND);
        }

        if (gameState.phase !== PHASE.DRAFT) {
            throw new DraftException(DRAFT_ERROR_CODE.PHASE_NOT_DRAFT);
        }

        await this.checkPickedArtifact(data.artifactId, gameState);

        const path = DRAFTPATH.getPickedArtifact(userId);
        await this.redisService.setJson<number>(key, path, data.artifactId);
    }

    async finishDraftOneArtifact(key: string, gameState: GameForClient) {
        const pathReadyPlayer = GAMEPATH.getPlayerReadyPath(gameState.player.id);
        const pathReadyEnemy = GAMEPATH.getPlayerReadyPath(gameState.enemy.id);

        const pathPickedArtifactPlayer = DRAFTPATH.getPickedArtifact(gameState.player.id);
        const pathPickedArtifactPlayerEnemy = DRAFTPATH.getPickedArtifact(gameState.enemy.id);

        const isReadyPlayer = await this.redisService.getJson<boolean>(key, pathReadyPlayer);
        const isReadyEnemy = await this.redisService.getJson<boolean>(key, pathReadyEnemy);

        const pickedArtifactPlayer = await this.redisService.getJson<number>(key, pathPickedArtifactPlayer);
        const pickedArtifactEnemy = await this.redisService.getJson<number>(key, pathPickedArtifactPlayerEnemy);

        if (isReadyPlayer && isReadyEnemy && pickedArtifactPlayer && pickedArtifactEnemy) {
            const pathPlayerArtifacts = GAMEPATH.getArtifactsPath(gameState.player.id);
            const pathEnemyArtifacts = GAMEPATH.getArtifactsPath(gameState.enemy.id);

            const playerArtifacts = await this.redisService.getJson<Record<string, ArtifactGameState>>(key, pathPlayerArtifacts);
            const enemyArtifacts = await this.redisService.getJson<Record<string, ArtifactGameState>>(key, pathEnemyArtifacts);

            if (playerArtifacts === null || enemyArtifacts === null) {
                throw new CommonException(COMMON_ERROR_CODE.INTERNAL_SERVER_ERROR);
            }

            const artifactPlayerId = uuidv4();
            const artifactEnemyId = uuidv4();

            const artifactPlayer: ArtifactGameState = {
                id: artifactPlayerId,
                artifactId: pickedArtifactPlayer,
                face: ARTIFACTS[pickedArtifactPlayer].faces[0],
                state: ARTIFACT_STATE.READY_TO_USE,
                currentHp: ARTIFACTS[pickedArtifactPlayer].hp,
                maxHp: ARTIFACTS[pickedArtifactPlayer].hp,
                position: Object.values(playerArtifacts).length,
                line: LINE.BACK,
                effects: ARTIFACTS[pickedArtifactPlayer].defaultEffects,
                availableActions: null
            }

            const artifactEnemy: ArtifactGameState = {
                id: artifactEnemyId,
                artifactId: pickedArtifactEnemy,
                face: ARTIFACTS[pickedArtifactEnemy].faces[0],
                state: ARTIFACT_STATE.READY_TO_USE,
                currentHp: ARTIFACTS[pickedArtifactEnemy].hp,
                maxHp: ARTIFACTS[pickedArtifactEnemy].hp,
                position: Object.values(enemyArtifacts).length,
                line: LINE.BACK,
                effects: ARTIFACTS[pickedArtifactEnemy].defaultEffects,
                availableActions: null
            }

            await this.redisService.setJson<ArtifactGameState>(
                key, 
                DRAFTPATH.getArtifactPath(gameState.player.id, artifactPlayerId), 
                artifactPlayer
            );
        
            await this.redisService.setJson<ArtifactGameState>(
                key, 
                DRAFTPATH.getArtifactPath(gameState.enemy.id, artifactEnemyId), 
                artifactEnemy
            );

            await this.redisService.setJson<number|null>(
                key, 
                DRAFTPATH.getPickedArtifact(gameState.player.id), 
                null
            );

            await this.redisService.setJson<number|null>(
                key, 
                DRAFTPATH.getPickedArtifact(gameState.enemy.id), 
                null
            );
    
            await this.redisService.setJson<boolean>(
                key, 
                GAMEPATH.getPlayerReadyPath(gameState.player.id), 
                false
            );

            await this.redisService.setJson<boolean>(
                key, 
                GAMEPATH.getPlayerReadyPath(gameState.enemy.id), 
                false
            );
        }
    }

    async toggleReadyDraft(gameId: string, userId: number) {
        const key = this.gameStateService.getKeyGame(gameId);
        const gameState = await this.gameStateService.getGameForClientById(gameId, userId);
        
        if (!gameState) {
            throw new GameException(GAME_ERROR_CODE.GAME_NOT_FOUND);
        }

        if (gameState.phase !== PHASE.DRAFT) {
            throw new DraftException(DRAFT_ERROR_CODE.PHASE_NOT_DRAFT);
        }

        await this.checkToggleReady(gameState);

        const path = GAMEPATH.getPlayerReadyPath(userId);

        const isReadyPlayer = await this.redisService.getJson<boolean>(key, path);
        await this.redisService.setJson<boolean>(key, path, !isReadyPlayer);

        await this.finishDraftOneArtifact(key, gameState);

        const pathPlayerArtifacts = GAMEPATH.getArtifactsPath(gameState.player.id);
        const playerArtifacts = await this.redisService.getJson<Record<string, ArtifactGameState>>(key, pathPlayerArtifacts);

        if (playerArtifacts === null) {
            throw new CommonException(COMMON_ERROR_CODE.INTERNAL_SERVER_ERROR);
        }

        if (Object.values(playerArtifacts).length && Object.values(playerArtifacts).length === DRAFT_COUNT_ARTIFACTS) {
            await this.finishDraft(key, gameState);
        }
    }

    async finishDraft(key: string, gameState: GameForClient) {
        await this.redisService.setJson<Phase>(
            key, 
            GAMEPATH.getPhasePath(), 
            PHASE.BATTLE
        );
    }
}
