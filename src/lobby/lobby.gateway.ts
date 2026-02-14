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
import { LobbyService } from './lobby.service';
import type { CreateLobbyData } from 'src/lobby/types/lobby-evens-data';
import { Lobby } from './types/lobby';
import { LOBBY_EVENT_NAME } from './types/lobby-events-name';
import { LOBBY_ROOMS_NAME } from './types/lobby-rooms-name';
import { UseGuards } from '@nestjs/common';
import { WebSocketAuthGuard } from 'src/auth/guards/websocket-auth.guard';
import { handleError } from 'src/common/utils/error-handler';


@WebSocketGateway()
export class LobbyGateway implements OnGatewayDisconnect  {
    constructor(private readonly lobbyService: LobbyService) {}

    @WebSocketServer()
    server: Server;


    async handleDisconnect(client: Socket) {
        // const userId = client.data.userId;
        // const lobby = await this.lobbyService.getLobbyByUserId(userId);
        
        // if (lobby) {
        //     await this.lobbyService.leaveLobby(lobby.id, userId);

        //     const lobbies = await this.lobbyService.getAllLobbies();
        //     this.server.to(LOBBY_ROOMS_NAME.HALL).emit(LOBBY_EVENT_NAME.LOBBY_LIST_UPDATE, lobbies)
        // }
    }
    
    @UseGuards(WebSocketAuthGuard)
    @SubscribeMessage(LOBBY_EVENT_NAME.JOIN_HALL)
    async handleJoinHall(client: Socket, data: null, callback: Function): Promise<void> {
        try {
            const userId = client.data.userId;
            await client.join(LOBBY_ROOMS_NAME.HALL)
            const lobbies = await this.lobbyService.getAllLobbies();
            const currentLobby = await this.lobbyService.getLobbyByUserId(userId);

            if (currentLobby !== null) {
                await client.join(`lobby-${currentLobby.id}`);
            }

            if (callback) {
                callback({
                    success: true,
                    data: {
                        lobbies: lobbies,
                        currentLobby: currentLobby
                    },
                    message: "Вы успешно вошли в холл"
                });
            }
        } 
        catch (error) {
            callback({
                success: false,
                data: null,
                message: error.message ?? "Ошибка на стороне сервера"
            });
        }
    }

    @UseGuards(WebSocketAuthGuard)
    @SubscribeMessage(LOBBY_EVENT_NAME.CREATE_LOBBY)
    async handleCreateLobby(client: Socket, data: CreateLobbyData, callback: Function): Promise<void> {
        try {
            const userId = client.data.userId;
            const lobbyId = await this.lobbyService.createLobby(data, userId);

            const lobbies = await this.lobbyService.getAllLobbies();

            this.server.to(LOBBY_ROOMS_NAME.HALL).emit(LOBBY_EVENT_NAME.LOBBY_LIST_UPDATE, lobbies)
            await client.join(`lobby-${lobbyId}`);

            const currentLobby = await this.lobbyService.getLobbyById(lobbyId);
            this.server.to(`lobby-${lobbyId}`).emit(LOBBY_EVENT_NAME.LOBBY_UPDATE, currentLobby)

            if (callback) {
                callback({
                    success: true,
                    data: null,
                    message: "Вы успешно создали лобби"
                });
            }
        } 
        catch (error) {
            handleError(error, callback);
        }
    }

    @UseGuards(WebSocketAuthGuard)
    @SubscribeMessage(LOBBY_EVENT_NAME.JOIN_LOBBY)
    async handleJoinLobby(client: Socket, lobbyId: string, callback: Function): Promise<void> {
        try {
            const userId = client.data.userId;
            const lobbyByUserId = await this.lobbyService.getLobbyByUserId(userId);

            if (lobbyByUserId !== null) {
                callback({
                    success: false,
                    data: null,
                    message: "Вы уже в лобби"
                });
                
                return;
            }


            await this.lobbyService.joinLobby(lobbyId, userId);
            const lobbies = await this.lobbyService.getAllLobbies();
            this.server.to(LOBBY_ROOMS_NAME.HALL).emit(LOBBY_EVENT_NAME.LOBBY_LIST_UPDATE, lobbies)
            
         
            await client.join(`lobby-${lobbyId}`)   
            const currentLobby = await this.lobbyService.getLobbyById(lobbyId);
            this.server.to(`lobby-${lobbyId}`).emit(LOBBY_EVENT_NAME.LOBBY_UPDATE, currentLobby)

            if (callback) {
                callback({
                    success: true,
                    data: null,
                    message: "Вы успешно вошли в лобби"
                });
            }
        } 
        catch (error) {
            handleError(error, callback);
        }
    }

    @UseGuards(WebSocketAuthGuard)
    @SubscribeMessage(LOBBY_EVENT_NAME.DELETE_LOBBY)
    async handleDeleteLobby(client: Socket, lobbyId: string, callback: Function): Promise<void> {
        try {
            await this.lobbyService.deleteLobby(lobbyId);
            const lobbies = await this.lobbyService.getAllLobbies();

            this.server.to(LOBBY_ROOMS_NAME.HALL).emit(LOBBY_EVENT_NAME.LOBBY_LIST_UPDATE, lobbies)
            this.server.to(`lobby-${lobbyId}`).emit(LOBBY_EVENT_NAME.LOBBY_UPDATE, null)
            this.server.in(`lobby-${lobbyId}`).socketsLeave(`lobby-${lobbyId}`);

            if (callback) {
                callback({
                    success: true,
                    data: null,
                    message: "Вы успешно удалили лобби"
                });
            }
        } 
        catch (error) {
            handleError(error, callback);
        }
    }

    @UseGuards(WebSocketAuthGuard)
    @SubscribeMessage(LOBBY_EVENT_NAME.TOGGLE_READY_LOBBY)
    async handleToggleReadyLobby(client: Socket, lobbyId: string, callback: Function): Promise<void> {
        try {
            const userId = client.data.userId;

            await this.lobbyService.toggleReadyLobby(lobbyId, userId);

            const lobbies = await this.lobbyService.getAllLobbies();
            this.server.to(LOBBY_ROOMS_NAME.HALL).emit(LOBBY_EVENT_NAME.LOBBY_LIST_UPDATE, lobbies)

            const currentLobby = await this.lobbyService.getLobbyById(lobbyId);
            this.server.to(`lobby-${lobbyId}`).emit(LOBBY_EVENT_NAME.LOBBY_UPDATE, currentLobby)

            if (callback) {
                callback({
                    success: true,
                    data: null,
                    message: "Вы успешно переключили готовность"
                });
            }
        } 
        catch (error) {
            handleError(error, callback);
        }
    }

    @UseGuards(WebSocketAuthGuard)
    @SubscribeMessage(LOBBY_EVENT_NAME.LEAVE_LOBBY)
    async handleLeaveLobby(client: Socket, lobbyId: string, callback: Function): Promise<void> {
        try {
            const userId = client.data.userId;

            await this.lobbyService.leaveLobby(lobbyId, userId);
            const lobbies = await this.lobbyService.getAllLobbies();

            this.server.to(LOBBY_ROOMS_NAME.HALL).emit(LOBBY_EVENT_NAME.LOBBY_LIST_UPDATE, lobbies)
            
            
            client.leave(`lobby-${lobbyId}`)
            const currentLobby = await this.lobbyService.getLobbyById(lobbyId);
            this.server.to(`lobby-${lobbyId}`).emit(LOBBY_EVENT_NAME.LOBBY_UPDATE, currentLobby)

            if (callback) {
                callback({
                    success: true,
                    data: null,
                    message: "Вы успешно вышли из лобби"
                });
            }
        } 
        catch (error) {
            handleError(error, callback);
        }
    }
}