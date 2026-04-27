import { 
    WebSocketGateway, 
    WebSocketServer, 
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket, 
    OnGatewayInit
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, Logger, UseGuards } from '@nestjs/common';
import { WebSocketAuthGuard } from 'src/auth/guards/websocket-auth.guard';
import { handleError } from 'src/common/utils/error-handler';
import { GameStateService } from './game-state.service';
import { GAME_EVENT_NAME } from './types/game-events-name';
import { GAME_ERROR_CODE, GameException } from './types/game-exceptions';
import { CONNECTIONGAME, LogState } from './types/game';
import { LOBBY_EVENT_NAME } from 'src/lobby/types/lobby-events-name';
import { LobbyService } from 'src/lobby/lobby.service';
import { LOBBY_ROOMS_NAME } from 'src/lobby/types/lobby-rooms-name';
import Redis from 'ioredis';
import { TIMER_TYPE, TimerType } from './types/timer';
import { GameTimerService } from './game-timer.service';
import { MINIPHASE, PHASE } from './types/phase';
import { DraftService } from 'src/draft/draft.service';
import { ActionService } from 'src/action/action.service';
import { GameNotificationData, NOTIFICATION_LEVEL } from './types/game-events-data';
import { MAX_SKIP_TURN } from 'src/game-mechanics/constants/settings';
import { LOG_TYPE } from 'src/action/types/log';


@WebSocketGateway()
export class GameStateGateway implements OnGatewayInit, OnGatewayDisconnect {
    private readonly logger = new Logger(GameStateGateway.name);
    private subscriber!: Redis;

    constructor(
        @Inject('REDIS_CLIENT') 
        private readonly redisClient: Redis,
        private readonly gameStateService: GameStateService,
        private readonly lobbyService: LobbyService,
        private readonly gameTimerService: GameTimerService,
        private readonly draftService: DraftService,
        private readonly actionService: ActionService
    ) {}

    @WebSocketServer()
    server!: Server;

    async onModuleDestroy() {
        if (this.subscriber) {
            await this.subscriber.punsubscribe();
            await this.subscriber.quit();
        }
    }

    async afterInit() {
        this.gameTimerService.setServer(this.server);

        this.subscriber = this.redisClient.duplicate();
        await this.subscriber.psubscribe('__keyevent@0__:expired');

        this.subscriber.on('pmessage', async (pattern, channel, expiredKey) => {
            await this.handleExpiredKey(expiredKey);
        });

    }

    private async handleExpiredKey(key: string) {
        if (!key.startsWith('timer:')) {
            return;
        }
        const parts = key.split(':');
        if (parts.length !== 3) {
            return;
        }

        const [, gameId, timerType] = parts;

        try {
            await this.handleTimerExpired(gameId, timerType as TimerType);
        } catch (error) {
            this.logger.error(`Error handling timer expiration for ${key}:`, error);
        }
    }

    private async handleTimerExpired(gameId: string, timerType: TimerType) {
        this.server.to(`game-${gameId}`).emit(GAME_EVENT_NAME.TIMER_EXPIRED, {
            gameId,
            timerType,
            timestamp: Date.now(),
        });

        switch (timerType) {
            case TIMER_TYPE.DRAFT:
                await this.handleDraftTimeout(gameId);
                break;
            case TIMER_TYPE.MOVEMENT:
                await this.handleMovementTimeout(gameId);
                break;
            case TIMER_TYPE.TURN:
                await this.handleTurnTimeout(gameId);
                break;
            default:
                this.logger.warn(`Unknown timer type: ${timerType}`);
        }

        this.server.to(`game-${gameId}`).emit(GAME_EVENT_NAME.GAME_STATE_UPDATED, gameId)
    }

    private async handleDraftTimeout(gameId: string) {
        const gameState = await this.gameStateService.getGameById(gameId);
        if (!gameState || gameState.phase !== PHASE.DRAFT || gameState.end) return;
        
        const players = Object.keys(gameState.players);
        
        for (const userId of players) {
            const player = gameState.players[Number(userId)];
            if (!player.isReady) {
                await this.draftService.autoFinishDraft(gameId, Number(userId));
            }
        }
    }

    private async handleMovementTimeout(gameId: string) {
        const gameState = await this.gameStateService.getGameById(gameId);
        if (!gameState || gameState.miniPhase !== MINIPHASE.MOVEMENT || gameState.end) return;
        
        const players = Object.keys(gameState.players);
        
        for (const userId of players) {
            const player = gameState.players[Number(userId)];
            if (!player.isReady) {
                await this.actionService.autoToggleReadyMovement(gameId, Number(userId));
            }
        }
    }

    private async handleTurnTimeout(gameId: string) {
        const gameState = await this.gameStateService.getGameById(gameId);
        if (!gameState || gameState.miniPhase !== MINIPHASE.BATTLE || gameState.end) return;
        
        const players = Object.keys(gameState.players);
        
        for (const userId of players) {
            const player = gameState.players[Number(userId)];
            if (gameState.currentTurn === player.id) {

                const skippedTurn = await this.actionService.autoEndTurn(gameId, Number(userId));

                if (skippedTurn) {
                    if (player.extraData.skippedMoves + 1 >= MAX_SKIP_TURN) {
                        await this.actionService.autoGiveUp(gameState.id, Number(userId));
                    }
                    else {
                        const notification: GameNotificationData = {
                            receiverId: player.id,
                            text: `Вы пропустили уже ${player.extraData.skippedMoves + 1} ходов. Если вы пропустите ${MAX_SKIP_TURN} ходов, то автоматически проиграете!`,
                            level: NOTIFICATION_LEVEL.WARNING
                        }

                        this.server.to(`game-${gameId}`).emit(GAME_EVENT_NAME.NEW_NOTIFICATION, notification);
                    }
                }
            }
        }
    }

    async handleDisconnect(client: Socket) {
        const userId = client.data.userId;
        const game = await this.gameStateService.getGameByUserId(userId);

        if (game) {
            await this.gameStateService.setPlayerConnectionStatus(CONNECTIONGAME.OFFLINE, game.id, userId);
            const gameForClient = await this.gameStateService.getGameForClientById(game.id, userId);
            
            if (gameForClient) {
                const playersOnline = {
                    [gameForClient.player.name]: CONNECTIONGAME.OFFLINE,
                    [gameForClient.enemy.name]: gameForClient.enemy.connection
                }

                client.to(`game-${game.id}`).emit(GAME_EVENT_NAME.PLAYERS_ONLINE_UPDATED, playersOnline)
            }
        }
    }
    
    @UseGuards(WebSocketAuthGuard)
    @SubscribeMessage(GAME_EVENT_NAME.CREATE_GAME)
    async handleCreateGame(client: Socket, lobbyId: string, callback: Function): Promise<void> {
        try {
            const userId = client.data.userId;

            const gameId = await this.gameStateService.createGameSessionState(lobbyId, userId);
            client.to(`lobby-${gameId}`).emit(LOBBY_EVENT_NAME.GAME_STARTED, gameId);

            this.server.to(LOBBY_ROOMS_NAME.HALL).emit(LOBBY_EVENT_NAME.LOBBY_LIST_UPDATED)

            const currentLobby = await this.lobbyService.getLobbyById(lobbyId);
            this.server.to(`lobby-${lobbyId}`).emit(LOBBY_EVENT_NAME.LOBBY_UPDATE, currentLobby)

            if (callback) {
                callback({
                    success: true,
                    data: {
                        gameId: gameId
                    },
                    message: "Вы успешно начали матч"
                });
            }
        } 
        catch (error) {
            handleError(error, callback);
        }
    }

    @UseGuards(WebSocketAuthGuard)
    @SubscribeMessage(GAME_EVENT_NAME.JOIN_GAME)
    async handleJoinGame(client: Socket, gameId: string, callback: Function): Promise<void> {
        try {
            const userId = client.data.userId;
            const game = await this.gameStateService.getGameForClientById(gameId, userId);

            if (game === null) {
                throw new GameException(GAME_ERROR_CODE.GAME_NOT_FOUND);
            }

            await client.join(`game-${gameId}`);

            client.data.gameId = gameId;

            await this.gameStateService.setPlayerConnectionStatus(CONNECTIONGAME.ONLINE, gameId, userId);

            const playersOnline = {
                [game.player.name]: CONNECTIONGAME.ONLINE,
                [game.enemy.name]: game.enemy.connection
            }

            client.to(`game-${gameId}`).emit(GAME_EVENT_NAME.PLAYERS_ONLINE_UPDATED, playersOnline)

            const activeTimer = await this.gameStateService.getActiveTimer(gameId);
            
            let timerInfo;
            if (activeTimer) {
                timerInfo = await this.gameStateService.getTimerInfo(gameId, activeTimer);
            }

            if (callback) {
                callback({
                    success: true,
                    data: {
                        gameState: game,
                        playersOnline: playersOnline,
                        timer: timerInfo ?? null,
                    },
                    message: "Вы успешно подключились к игре"
                });
            }
        } 
        catch (error) {
            handleError(error, callback);
        }
    }

    @UseGuards(WebSocketAuthGuard)
    @SubscribeMessage(GAME_EVENT_NAME.GET_GAME_STATE)
    async handleGetGameState(client: Socket, gameId: string, callback: Function): Promise<void> {
        try {
            const userId = client.data.userId;
            const game = await this.gameStateService.getGameForClientById(gameId, userId);

            if (game === null) {
                throw new GameException(GAME_ERROR_CODE.GAME_NOT_FOUND);
            }

            if (callback) {
                callback({
                    success: true,
                    data: {
                        gameState: game
                    },
                    message: "Вы успешно получили игровое состояние"
                });
            }
        } 
        catch (error) {
            handleError(error, callback);
        }
    }
}