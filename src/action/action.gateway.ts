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
import { GameStateService } from 'src/game-state/game-state.service';
import { ACTION_EVENT_NAME } from './types/action-events-name';
import type { EndRoundData, EndTurnData, ExtraActionData, UseFaceData, UseSkillData } from './types/action-evens-data';
import { ActionService } from './action.service';
import { GAME_EVENT_NAME } from 'src/game-state/types/game-events-name';
import { AnimationData } from './types/animation';


@WebSocketGateway()
export class ActionGateway  {
    constructor(
        private readonly gameStateService: GameStateService,
        private readonly actionService: ActionService
    ) {}

    @WebSocketServer()
    server: Server;

    
    @UseGuards(WebSocketAuthGuard)
    @SubscribeMessage(ACTION_EVENT_NAME.USE_FACE)
    async handleUseFace(client: Socket, data: UseFaceData, callback: Function): Promise<void> {
        try {
            const userId = client.data.userId;
            const animations: AnimationData[] = [];

            await this.actionService.useFace(data, userId, animations);

            this.server.to(`game-${data.gameId}`).emit(GAME_EVENT_NAME.GAME_STATE_UPDATED, data.gameId)
            
            animations.forEach(animation => {
                this.server.to(`game-${data.gameId}`).emit(ACTION_EVENT_NAME.ANIMATION, animation)
            });

            if (callback) {
                callback({
                    success: true,
                    data: null,
                    message: "Вы успешно использовали грань"
                });
            }
        } 
        catch (error) {
            handleError(error, callback);
        }
    }

    @UseGuards(WebSocketAuthGuard)
    @SubscribeMessage(ACTION_EVENT_NAME.USE_SKILL)
    async handleSkill(client: Socket, data: UseSkillData, callback: Function): Promise<void> {
        try {
            const userId = client.data.userId;
            const animations: AnimationData[] = [];

            await this.actionService.useSkill(data, userId, animations);

            this.server.to(`game-${data.gameId}`).emit(GAME_EVENT_NAME.GAME_STATE_UPDATED, data.gameId)
            
            animations.forEach(animation => {
                this.server.to(`game-${data.gameId}`).emit(ACTION_EVENT_NAME.ANIMATION, animation)
            });

            if (callback) {
                callback({
                    success: true,
                    data: null,
                    message: "Вы успешно использовали грань"
                });
            }
        } 
        catch (error) {
            handleError(error, callback);
        }
    }

    @UseGuards(WebSocketAuthGuard)
    @SubscribeMessage(ACTION_EVENT_NAME.END_TURN)
    async handleEndTurn(client: Socket, gameId: string, callback: Function): Promise<void> {
        try {
            const userId = client.data.userId;
            await this.actionService.endTurn(gameId, userId);

            this.server.to(`game-${gameId}`).emit(GAME_EVENT_NAME.GAME_STATE_UPDATED, gameId)

            if (callback) {
                callback({
                    success: true,
                    data: null,
                    message: "Вы успешно закончили ход"
                });
            }
        } 
        catch (error) {
            handleError(error, callback);
        }
    }

    @UseGuards(WebSocketAuthGuard)
    @SubscribeMessage(ACTION_EVENT_NAME.END_ROUND)
    async handleEndRound(client: Socket, gameId: string, callback: Function): Promise<void> {
        try {
            const userId = client.data.userId;
            await this.actionService.endRound(gameId, userId);

            this.server.to(`game-${gameId}`).emit(GAME_EVENT_NAME.GAME_STATE_UPDATED, gameId)

            if (callback) {
                callback({
                    success: true,
                    data: null,
                    message: "Вы успешно закончили ход"
                });
            }
        } 
        catch (error) {
            handleError(error, callback);
        }
    }

    @UseGuards(WebSocketAuthGuard)
    @SubscribeMessage(ACTION_EVENT_NAME.EXTRA_ACTION)
    async handleExtraAction(client: Socket, data: ExtraActionData, callback: Function): Promise<void> {
        try {
            const userId = client.data.userId;
            const animations: AnimationData[] = [];

            await this.actionService.extraAction(data, userId, animations);

            this.server.to(`game-${data.gameId}`).emit(GAME_EVENT_NAME.GAME_STATE_UPDATED, data.gameId)
            
            animations.forEach(animation => {
                this.server.to(`game-${data.gameId}`).emit(ACTION_EVENT_NAME.ANIMATION, animation)
            });

            if (callback) {
                callback({
                    success: true,
                    data: null,
                    message: "Вы успешно использовали дополнительное действие"
                });
            }
        } 
        catch (error) {
            handleError(error, callback);
        }
    }
}