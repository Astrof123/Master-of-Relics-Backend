import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { GameStateService } from './game-state.service';
import { TimerType } from './types/timer';
import { Server } from 'socket.io';
import { GAME_EVENT_NAME } from './types/game-events-name';

@Injectable()
export class GameTimerService {
    private readonly logger = new Logger(GameTimerService.name);
    
    private server: Server | null = null;

    constructor(
        @Inject(forwardRef(() => GameStateService))
        private readonly gameStateService: GameStateService,
    ) {}

    setServer(server: Server) {
        this.server = server;
    }

    async startTimer(
        gameId: string, 
        timerType: TimerType, 
        duration: number
    ): Promise<void> {
        this.logger.log(`Starting ${timerType} timer for game ${gameId}`);
        
        await this.gameStateService.startGameTimer(gameId, timerType, duration);
        
        const timerInfo = await this.gameStateService.getTimerInfo(gameId, timerType);

        if (this.server) {
            this.server.to(`game-${gameId}`).emit(GAME_EVENT_NAME.TIMER_START, {
                gameId,
                timerType,
                ...timerInfo,
            });
        }
    }

    async stopTimer(gameId: string, timerType: TimerType): Promise<void> {
        this.logger.log(`Stopping ${timerType} timer for game ${gameId}`);
        
        await this.gameStateService.cancelGameTimer(gameId, timerType);
        
        if (this.server) {
            this.server.to(`game-${gameId}`).emit('timer:cancel', {
                gameId,
                timerType,
            });
        }
    }

    async stopAllTimers(gameId: string): Promise<void> {
        this.logger.log(`Stopping all timers for game ${gameId}`);
        
        await this.gameStateService.cancelAllGameTimers(gameId);
        
        if (this.server) {
            this.server.to(`game-${gameId}`).emit('timer:cancel-all', {
                gameId,
            });
        }
    }

    async syncTimersOnRecovery(gameId: string): Promise<void> {
        const game = await this.gameStateService.getGameById(gameId);
        
        if (!game) {
            return;
        }

        const activeTimer = await this.gameStateService.getActiveTimer(gameId);
        
        // const timerInfo = await this.gameStateService.getTimerInfo(gameId, activeTimer);
        
        // if (this.server) {
        //     this.server.to(`game-${gameId}`).emit('timer:sync', {
        //         gameId,
        //         timerType: activeTimer,
        //         ...timerInfo,
        //     });
        // }
    }
}