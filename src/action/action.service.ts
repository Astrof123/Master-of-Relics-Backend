import { Injectable } from '@nestjs/common';
import { EndRoundData, EndTurnData, ExtraActionData, UseFaceData, UseSkillData } from './types/action-evens-data';
import { GameStateService } from 'src/game-state/game-state.service';
import { GAME_ERROR_CODE, GameException } from 'src/game-state/types/game-exceptions';
import { PHASE } from 'src/game-state/types/phase';
import { ACTION_ERROR_CODE, ActionException } from './types/action-exceptions';
import { GameForLogic } from 'src/game-state/types/game-for-logic';
import { ActionValidatorService } from './action-validator.service';
import { ActionResolverService } from './action-resolver.service';
import { ArtifactService } from 'src/artifact/artifact.service';
import { AnimationData } from './types/animation';

@Injectable()
export class ActionService {
    constructor(
        private readonly gameStateService: GameStateService,
        private readonly actionValidatorService: ActionValidatorService,
        private readonly actionResolverService: ActionResolverService,
        private readonly artifactService: ArtifactService,
    ) {}

    async useFace(data: UseFaceData, userId: number, animations: AnimationData[]) {
        const key = this.gameStateService.getKeyGame(data.gameId);
        const gameState = await this.gameStateService.getGameForLogicById(data.gameId, userId);

        if (!gameState) {
            throw new GameException(GAME_ERROR_CODE.GAME_NOT_FOUND);
        }

        const artifact = gameState.player.artifacts[data.artifactGameId];

        if (!artifact) {
            throw new ActionException(ACTION_ERROR_CODE.UNKNOWN_ARTIFACT);
        }

        this.actionValidatorService.useFaceValidator(gameState, artifact, data);
        this.actionResolverService.useFaceResolve(gameState, artifact, data, animations);

        this.artifactService.calculateAvailableActions(gameState, gameState.player, gameState.enemy);
        await this.gameStateService.saveGameForLogic(gameState, key);
    }

    async useSkill(data: UseSkillData, userId: number, animations: AnimationData[]) {
        const key = this.gameStateService.getKeyGame(data.gameId);
        const gameState = await this.gameStateService.getGameForLogicById(data.gameId, userId);

        if (!gameState) {
            throw new GameException(GAME_ERROR_CODE.GAME_NOT_FOUND);
        }

        const artifact = gameState.player.artifacts[data.artifactGameId];

        if (!artifact) {
            throw new ActionException(ACTION_ERROR_CODE.UNKNOWN_ARTIFACT);
        }

        this.actionValidatorService.useSkillValidator(gameState, artifact, data);
        this.actionResolverService.useSkillResolve(gameState, artifact, data, animations);

        this.artifactService.calculateAvailableActions(gameState, gameState.player, gameState.enemy);
        await this.gameStateService.saveGameForLogic(gameState, key);
    }

    async endTurn(gameId: string, userId: number) {
        const key = this.gameStateService.getKeyGame(gameId);
        const gameState = await this.gameStateService.getGameForLogicById(gameId, userId);
        
        if (!gameState) {
            throw new GameException(GAME_ERROR_CODE.GAME_NOT_FOUND);
        }

        this.actionValidatorService.endTurnValidator(gameState);
        this.actionResolverService.endTurnResolve(gameState);

        await this.gameStateService.saveGameForLogic(gameState, key);
    }

    async endRound(gameId: string, userId: number) {
        const key = this.gameStateService.getKeyGame(gameId);
        const gameState = await this.gameStateService.getGameForLogicById(gameId, userId);
        
        if (!gameState) {
            throw new GameException(GAME_ERROR_CODE.GAME_NOT_FOUND);
        }

        this.actionValidatorService.endRoundValidator(gameState);
        this.actionResolverService.endRoundResolve(gameState);

        await this.gameStateService.saveGameForLogic(gameState, key);
    }

    async extraAction(data: ExtraActionData, userId: number, animations: AnimationData[]) {
        const key = this.gameStateService.getKeyGame(data.gameId);
        const gameState = await this.gameStateService.getGameForLogicById(data.gameId, userId);
        
        if (!gameState) {
            throw new GameException(GAME_ERROR_CODE.GAME_NOT_FOUND);
        }

        const artifact = gameState.player.artifacts[data.artifactGameId];

        if (!artifact) {
            throw new ActionException(ACTION_ERROR_CODE.UNKNOWN_ARTIFACT);
        }

        this.actionValidatorService.extraActionValidator(gameState, artifact, data);
        this.actionResolverService.extraActionResolve(gameState, artifact, data, animations);

        this.artifactService.calculateAvailableActions(gameState, gameState.player, gameState.enemy);
        await this.gameStateService.saveGameForLogic(gameState, key);
    }


}
