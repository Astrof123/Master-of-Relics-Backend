import { Injectable } from '@nestjs/common';
import { EndRoundData, EndTurnData, ExtraActionData, ToggleReadyMovementData, UseFaceData, UseSkillData, UseSpellData } from './types/action-evens-data';
import { GameStateService } from 'src/game-state/game-state.service';
import { GAME_ERROR_CODE, GameException } from 'src/game-state/types/game-exceptions';
import { PHASE } from 'src/game-state/types/phase';
import { ACTION_ERROR_CODE, ActionException } from './types/action-exceptions';
import { GameForLogic } from 'src/game-state/types/game-for-logic';
import { ActionValidatorService } from './action-validator.service';
import { ActionResolverService } from './action-resolver.service';

import { AnimationData } from './types/animation';
import { PhaseModule } from 'src/phase/phase.module';
import { PhaseService } from 'src/phase/phase.service';
import { RedisModule } from 'src/redis/redis.module';
import { RedisService } from 'src/redis/redis.service';
import { COMMON_ERROR_CODE, CommonException } from 'src/common/utils/error-handler';
import { GameTimerService } from 'src/game-state/game-timer.service';
import { TIMER_TYPE } from 'src/game-state/types/timer';
import { RESOURCE } from 'src/game-mechanics/types/resource';
import { ResourceService } from 'src/game-mechanics/resource.service';
import { LOG_TYPE } from './types/log';
import { MAX_SKIP_TURN } from 'src/game-mechanics/constants/settings';

@Injectable()
export class ActionService {
    constructor(
        private readonly gameStateService: GameStateService,
        private readonly actionValidatorService: ActionValidatorService,
        private readonly actionResolverService: ActionResolverService,
        private readonly phaseService: PhaseService,
        private readonly redisService: RedisService,
        private readonly gameTimerService: GameTimerService,
        private readonly resourceService: ResourceService
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

        await this.phaseService.calculateNewState(gameState, false);
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

        await this.phaseService.calculateNewState(gameState, false);
        await this.gameStateService.saveGameForLogic(gameState, key);
    }

    async useSpell(data: UseSpellData, userId: number, animations: AnimationData[]) {
        const key = this.gameStateService.getKeyGame(data.gameId);
        const gameState = await this.gameStateService.getGameForLogicById(data.gameId, userId);

        if (!gameState) {
            throw new GameException(GAME_ERROR_CODE.GAME_NOT_FOUND);
        }

        this.actionValidatorService.useSpellValidator(gameState, data);
        this.actionResolverService.useSpellResolve(gameState, data, animations);

        await this.phaseService.calculateNewState(gameState, false);
        await this.gameStateService.saveGameForLogic(gameState, key);
    }

    async endTurn(gameId: string, userId: number) {
        const key = this.gameStateService.getKeyGame(gameId);
        const gameState = await this.gameStateService.getGameForLogicById(gameId, userId);
        
        if (!gameState) {
            throw new GameException(GAME_ERROR_CODE.GAME_NOT_FOUND);
        }

        this.actionValidatorService.endTurnValidator(gameState);
        await this.actionResolverService.endTurnResolve(gameState);
        await this.gameTimerService.stopAllTimers(gameState.id);
        if (gameState.constants.timerTurn !== null) {
            await this.gameTimerService.startTimer(gameState.id, TIMER_TYPE.TURN, gameState.constants.timerTurn);
        }
        await this.gameStateService.saveGameForLogic(gameState, key);
    }

    async giveUp(gameId: string, userId: number) {
        const key = this.gameStateService.getKeyGame(gameId);
        const gameState = await this.gameStateService.getGameForLogicById(gameId, userId);
        
        if (!gameState) {
            throw new GameException(GAME_ERROR_CODE.GAME_NOT_FOUND);
        }

        this.actionValidatorService.giveUpValidator(gameState);
        await this.actionResolverService.giveUpResolve(gameState);
            
        await this.gameStateService.saveGameForLogic(gameState, key);
    }

    async autoGiveUp(gameId: string, userId: number) {
        const key = this.gameStateService.getKeyGame(gameId);
        const gameState = await this.gameStateService.getGameForLogicById(gameId, userId);
        
        if (!gameState) {
            throw new GameException(GAME_ERROR_CODE.GAME_NOT_FOUND);
        }
        await this.actionResolverService.autoGiveUpResolve(gameState);
        await this.gameStateService.saveGameForLogic(gameState, key);
    }

    async offerDraw(gameId: string, userId: number) {
        const key = this.gameStateService.getKeyGame(gameId);
        const gameState = await this.gameStateService.getGameForLogicById(gameId, userId);
        
        if (!gameState) {
            throw new GameException(GAME_ERROR_CODE.GAME_NOT_FOUND);
        }

        this.actionValidatorService.drawValidator(gameState);
        await this.actionResolverService.offerDrawResolve(gameState);

        await this.gameStateService.saveGameForLogic(gameState, key);
    }

    async cancelDraw(gameId: string, userId: number) {
        const key = this.gameStateService.getKeyGame(gameId);
        const gameState = await this.gameStateService.getGameForLogicById(gameId, userId);
        
        if (!gameState) {
            throw new GameException(GAME_ERROR_CODE.GAME_NOT_FOUND);
        }

        this.actionValidatorService.drawValidator(gameState);
        await this.actionResolverService.cancelDrawResolve(gameState);

        await this.gameStateService.saveGameForLogic(gameState, key);
    }

    async endRound(gameId: string, userId: number) {
        const key = this.gameStateService.getKeyGame(gameId);
        const gameState = await this.gameStateService.getGameForLogicById(gameId, userId);
        
        if (!gameState) {
            throw new GameException(GAME_ERROR_CODE.GAME_NOT_FOUND);
        }

        this.actionValidatorService.endRoundValidator(gameState);
        await this.actionResolverService.endRoundResolve(gameState);

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

        await this.phaseService.calculateNewState(gameState, false);
        await this.gameStateService.saveGameForLogic(gameState, key);
    }

    async toggleReadyMovement(data: ToggleReadyMovementData, userId: number): Promise<void> {
        const key = this.gameStateService.getKeyGame(data.gameId);
        const maxRetries = 5;
        let retries = 0;
        let isSuccess = false;

        while (retries < maxRetries && !isSuccess) {
            await this.redisService.watch(key);
            
            try {
                const gameState = await this.gameStateService.getGameForLogicById(data.gameId, userId);
                
                if (!gameState) {
                    await this.redisService.unwatch();
                    throw new GameException(GAME_ERROR_CODE.GAME_NOT_FOUND);
                }

                this.actionValidatorService.toggleReadyMovementValidator(gameState, data);
                
                const endMovement = await this.actionResolverService.toggleReadyMovementResolve(
                    gameState, 
                    data
                );
                
                const multi = this.redisService.multi();
                await this.gameStateService.saveGameForLogicInTransaction(gameState, key, multi);
                const results = await this.redisService.execMulti(multi);

                if (results === null) {
                    retries++;
                    continue;
                }
                
                isSuccess = true;

                if (endMovement) {
                    await this.gameTimerService.stopAllTimers(gameState.id);
                    if (gameState.constants.timerTurn !== null) {
                        await this.gameTimerService.startTimer(gameState.id, TIMER_TYPE.TURN, gameState.constants.timerTurn);
                    }
                }
                
            } catch (error) {
                await this.redisService.unwatch();
                retries++;
                
                if (retries >= maxRetries) {
                    if (error instanceof GameException) {
                        throw error;
                    }
                    throw new CommonException(COMMON_ERROR_CODE.INTERNAL_SERVER_ERROR);
                }
            }
        }
        
        if (!isSuccess) {
            throw new CommonException(COMMON_ERROR_CODE.INTERNAL_SERVER_ERROR);
        }
    }

    async autoToggleReadyMovement(gameId: string, userId: number): Promise<void> {
        const key = this.gameStateService.getKeyGame(gameId);
        const maxRetries = 5;
        let retries = 0;
        let isSuccess = false;

        while (retries < maxRetries && !isSuccess) {
            await this.redisService.watch(key);
            
            try {
                const gameState = await this.gameStateService.getGameForLogicById(gameId, userId);
                
                if (!gameState) {
                    await this.redisService.unwatch();
                    throw new GameException(GAME_ERROR_CODE.GAME_NOT_FOUND);
                }

                if (gameState.player.isReady) {
                    return;
                }

                const endMovement = await this.actionResolverService.autoToggleReadyMovementResolve(
                    gameState
                );
                
                const multi = this.redisService.multi();
                await this.gameStateService.saveGameForLogicInTransaction(gameState, key, multi);
                const results = await this.redisService.execMulti(multi);

                if (results === null) {
                    retries++;
                    continue;
                }
                
                isSuccess = true;

                if (endMovement) {
                    await this.gameTimerService.stopAllTimers(gameState.id);
                    if (gameState.constants.timerTurn !== null) {
                        await this.gameTimerService.startTimer(gameState.id, TIMER_TYPE.TURN, gameState.constants.timerTurn);
                    }
                }
                
            } catch (error) {
                await this.redisService.unwatch();
                retries++;
                
                if (retries >= maxRetries) {
                    if (error instanceof GameException) {
                        throw error;
                    }
                    throw new CommonException(COMMON_ERROR_CODE.INTERNAL_SERVER_ERROR);
                }
            }
        }
        
        if (!isSuccess) {
            throw new CommonException(COMMON_ERROR_CODE.INTERNAL_SERVER_ERROR);
        }
    }

    async autoEndTurn(gameId: string, userId: number): Promise<boolean> {
        const key = this.gameStateService.getKeyGame(gameId);
        const maxRetries = 5;
        let retries = 0;
        let isSuccess = false;

        while (retries < maxRetries && !isSuccess) {
            await this.redisService.watch(key);
            
            try {
                const gameState = await this.gameStateService.getGameForLogicById(gameId, userId);
                debugger
                if (!gameState) {
                    await this.redisService.unwatch();
                    throw new GameException(GAME_ERROR_CODE.GAME_NOT_FOUND);
                }

                if (gameState.currentTurn !== gameState.player.id) {
                    return false;
                }

                if (gameState.player.resources[RESOURCE.AGILITY] >= 10) {
                    const logParts: string[] = [];
                    this.resourceService.decreaseResource(gameState.player, RESOURCE.AGILITY, 10, logParts);
                    logParts.push("Из-за пропуска хода")
                    gameState.logs.push({ text: logParts.join('. ') + '.', type: LOG_TYPE.SYSTEM})
                }
                else if (gameState.player.resources[RESOURCE.RAGE] >= 10) {
                    const logParts: string[] = [];
                    this.resourceService.decreaseResource(gameState.player, RESOURCE.RAGE, 10, logParts);
                    logParts.push("Из-за пропуска хода")
                    gameState.logs.push({ text: logParts.join('. ') + '.', type: LOG_TYPE.SYSTEM})
                }
                else if (gameState.player.resources[RESOURCE.LIGHT_MANA] >= 10) {
                    const logParts: string[] = [];
                    this.resourceService.decreaseResource(gameState.player, RESOURCE.LIGHT_MANA, 10, logParts);
                    logParts.push("Из-за пропуска хода")
                    gameState.logs.push({ text: logParts.join('. ') + '.', type: LOG_TYPE.SYSTEM})
                }
                else if (gameState.player.resources[RESOURCE.DARK_MANA] >= 10) {
                    const logParts: string[] = [];
                    this.resourceService.decreaseResource(gameState.player, RESOURCE.DARK_MANA, 10, logParts);
                    logParts.push("Из-за пропуска хода")
                    gameState.logs.push({ text: logParts.join('. ') + '.', type: LOG_TYPE.SYSTEM})
                }
                else if (gameState.player.resources[RESOURCE.DESTRUCTION_MANA] >= 10) {
                    const logParts: string[] = [];
                    this.resourceService.decreaseResource(gameState.player, RESOURCE.DESTRUCTION_MANA, 10, logParts);
                    logParts.push("Из-за пропуска хода")
                    gameState.logs.push({ text: logParts.join('. ') + '.', type: LOG_TYPE.SYSTEM})
                }

                await this.actionResolverService.endTurnResolve(gameState);
                gameState.player.extraData.skippedMoves += 1;

                const multi = this.redisService.multi();
                await this.gameStateService.saveGameForLogicInTransaction(gameState, key, multi);
                const results = await this.redisService.execMulti(multi);

                if (results === null) {
                    retries++;
                    continue;
                }
                
                isSuccess = true;

                await this.gameTimerService.stopAllTimers(gameState.id);
                if (gameState.constants.timerTurn !== null) {
                    await this.gameTimerService.startTimer(gameState.id, TIMER_TYPE.TURN, gameState.constants.timerTurn);
                }
                
            } catch (error) {
                await this.redisService.unwatch();
                retries++;
                
                if (retries >= maxRetries) {
                    if (error instanceof GameException) {
                        throw error;
                    }
                    throw new CommonException(COMMON_ERROR_CODE.INTERNAL_SERVER_ERROR);
                }
            }
        }
        
        if (!isSuccess) {
            throw new CommonException(COMMON_ERROR_CODE.INTERNAL_SERVER_ERROR);
        }

        return true;
    }
}
