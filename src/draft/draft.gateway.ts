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
import { DRAFT_EVENT_NAME } from './types/draft-events-name';
import { DraftService } from './draft.service';
import type { PickArtifactData } from './types/draft-evens-data';
import { GAME_EVENT_NAME } from 'src/game-state/types/game-events-name';


@WebSocketGateway()
export class DraftGateway {
    constructor(
        private readonly draftService: DraftService
    ) {}

    @WebSocketServer()
    server!: Server;

    
    @UseGuards(WebSocketAuthGuard)
    @SubscribeMessage(DRAFT_EVENT_NAME.PICK_ARTIFACT)
    async handlePickArtifact(client: Socket, data: PickArtifactData, callback: Function): Promise<void> {
        try {
            const userId = client.data.userId;

            await this.draftService.pickArtifact(data, userId);

            if (callback) {
                callback({
                    success: true,
                    data: null,
                    message: "Вы успешно выбрали карту"
                });
            }
        } 
        catch (error) {
            handleError(error, callback);
        }
    }

    @UseGuards(WebSocketAuthGuard)
    @SubscribeMessage(DRAFT_EVENT_NAME.TOGGLE_READY_DRAFT)
    async handleToggleReadyDraft(client: Socket, gameId: string, callback: Function): Promise<void> {
        try {
            const userId = client.data.userId;

            await this.draftService.toggleReadyDraft(gameId, userId);

            this.server.to(`game-${gameId}`).emit(GAME_EVENT_NAME.GAME_STATE_UPDATED, gameId)


            if (callback) {
                callback({
                    success: true,
                    data: null,
                    message: "Вы успешно закончили выбор"
                });
            }
        } 
        catch (error) {
            handleError(error, callback);
        }
    }
}