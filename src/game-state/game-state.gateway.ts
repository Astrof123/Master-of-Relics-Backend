import { 
    WebSocketGateway, 
    WebSocketServer, 
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket 
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WebSocketAuthGuard } from 'src/auth/guards/websocket-auth.guard';
import { handleError } from 'src/common/utils/error-handler';
import { GameStateService } from './game-state.service';
import { GAME_EVENT_NAME } from './types/game-events-name';
import { GAME_ERROR_CODE, GameException } from './types/game-exceptions';
import { CONNECTIONGAME } from './types/game';
import { LOBBY_EVENT_NAME } from 'src/lobby/types/lobby-events-name';
import { LobbyService } from 'src/lobby/lobby.service';
import { LOBBY_ROOMS_NAME } from 'src/lobby/types/lobby-rooms-name';


@WebSocketGateway()
export class GameStateGateway implements OnGatewayDisconnect  {
    constructor(
        private readonly gameStateService: GameStateService,
        private readonly lobbyService: LobbyService 
    ) {}

    @WebSocketServer()
    server!: Server;


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
            await this.gameStateService.setPlayerConnectionStatus(CONNECTIONGAME.ONLINE, gameId, userId);

            const playersOnline = {
                [game.player.name]: CONNECTIONGAME.ONLINE,
                [game.enemy.name]: game.enemy.connection
            }

            client.to(`game-${gameId}`).emit(GAME_EVENT_NAME.PLAYERS_ONLINE_UPDATED, playersOnline)

            if (callback) {
                callback({
                    success: true,
                    data: {
                        gameState: game,
                        playersOnline: playersOnline
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