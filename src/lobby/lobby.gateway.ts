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
import type { CreateLobbyData, InviteFriendData, UpdateOptionsLobbyData } from 'src/lobby/types/lobby-evens-data';
import type { Lobby, LobbyInvitation } from './types/lobby';
import { LOBBY_EVENT_NAME } from './types/lobby-events-name';
import { LOBBY_ROOMS_NAME } from './types/lobby-rooms-name';
import { UseGuards } from '@nestjs/common';
import { WebSocketAuthGuard } from 'src/auth/guards/websocket-auth.guard';
import { handleError } from 'src/common/utils/error-handler';
import { GameStateService } from 'src/game-state/game-state.service';
import { SocketConnectionService } from 'src/socket-connection/socket-connection.service';


@WebSocketGateway()
export class LobbyGateway implements OnGatewayDisconnect  {
    constructor(
        private readonly lobbyService: LobbyService,
        private readonly gameStateService: GameStateService,
        private readonly socketConnectionService: SocketConnectionService
    ) {}

    @WebSocketServer()
    server!: Server;


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
            await client.join(`user:${userId}`)
            const lobbies = await this.lobbyService.getAllLobbies(userId);
            const currentLobby = await this.lobbyService.getLobbyByUserId(userId);

            if (currentLobby !== null) {
                await client.join(`lobby-${currentLobby.id}`);
            }

            const invitations = await this.lobbyService.getInvitations(userId);
            const onlinePlayers = await this.socketConnectionService.getOnlinePlayers();
            if (callback) {
                callback({
                    success: true,
                    data: {
                        lobbies: lobbies,
                        currentLobby: currentLobby,
                        onlinePlayers: onlinePlayers.length,
                        invitations: invitations
                    },
                    message: "Вы успешно вошли в холл"
                });
            }
        } 
        catch (error) {
            handleError(error, callback);
        }
    }

    @UseGuards(WebSocketAuthGuard)
    @SubscribeMessage(LOBBY_EVENT_NAME.GET_LOBBY_LIST)
    async handleGetLobbyList(client: Socket, data: null, callback: Function): Promise<void> {
        try {
            const userId = client.data.userId;
            const lobbies = await this.lobbyService.getAllLobbies(userId);

            if (callback) {
                callback({
                    success: true,
                    data: {
                        lobbies: lobbies
                    },
                    message: "Вы успешно получили лобби"
                });
            }
        } 
        catch (error) {
            handleError(error, callback);
        }
    }

    @UseGuards(WebSocketAuthGuard)
    @SubscribeMessage(LOBBY_EVENT_NAME.CREATE_LOBBY)
    async handleCreateLobby(client: Socket, data: CreateLobbyData, callback: Function): Promise<void> {
        try {
            const userId = client.data.userId;
            const lobbyId = await this.lobbyService.createLobby(data, userId);

            this.server.to(LOBBY_ROOMS_NAME.HALL).emit(LOBBY_EVENT_NAME.LOBBY_LIST_UPDATED)
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
    @SubscribeMessage(LOBBY_EVENT_NAME.UPDATE_OPTIONS)
    async handleUpdateOptionsLobby(client: Socket, data: UpdateOptionsLobbyData, callback: Function): Promise<void> {
        try {
            const userId = client.data.userId;
            const lobbyId = await this.lobbyService.updateOptionsLobby(data, userId);

            this.server.to(LOBBY_ROOMS_NAME.HALL).emit(LOBBY_EVENT_NAME.LOBBY_LIST_UPDATED)

            const currentLobby = await this.lobbyService.getLobbyById(lobbyId);
            this.server.to(`lobby-${lobbyId}`).emit(LOBBY_EVENT_NAME.LOBBY_UPDATE, currentLobby)

            if (callback) {
                callback({
                    success: true,
                    data: null,
                    message: "Вы успешно поменяли настройки лобби"
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

            await this.lobbyService.joinLobby(lobbyId, userId);
            this.server.to(LOBBY_ROOMS_NAME.HALL).emit(LOBBY_EVENT_NAME.LOBBY_LIST_UPDATED)
            
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
    @SubscribeMessage(LOBBY_EVENT_NAME.JOIN_LOBBY_BY_CODE)
    async handleJoinLobbyByCode(client: Socket, code: string, callback: Function): Promise<void> {
        try {
            const userId = client.data.userId;

            const lobby = await this.lobbyService.getLobbyByCode(code);
            
            if (lobby === null) {
                callback({
                    success: false,
                    data: null,
                    message: "Лобби не найдено"
                });

                return;
            }

            await this.lobbyService.joinLobby(lobby.id, userId);
            this.server.to(LOBBY_ROOMS_NAME.HALL).emit(LOBBY_EVENT_NAME.LOBBY_LIST_UPDATED)
            
            await client.join(`lobby-${lobby.id}`)   
            const currentLobby = await this.lobbyService.getLobbyById(lobby.id);
            this.server.to(`lobby-${lobby.id}`).emit(LOBBY_EVENT_NAME.LOBBY_UPDATE, currentLobby)

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
            await this.gameStateService.deleteGame(lobbyId);
            const userId = client.data.userId;

            this.server.to(LOBBY_ROOMS_NAME.HALL).emit(LOBBY_EVENT_NAME.LOBBY_LIST_UPDATED)
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

            this.server.to(LOBBY_ROOMS_NAME.HALL).emit(LOBBY_EVENT_NAME.LOBBY_LIST_UPDATED)

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
            this.server.to(LOBBY_ROOMS_NAME.HALL).emit(LOBBY_EVENT_NAME.LOBBY_LIST_UPDATED)
            
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
    
    @UseGuards(WebSocketAuthGuard)
    @SubscribeMessage(LOBBY_EVENT_NAME.INVITE_FRIEND)
    async handleInviteFriend(client: Socket, data: InviteFriendData, callback: Function): Promise<void> {
        try {
            const userId = client.data.userId;

            await this.lobbyService.inviteFriend(data, userId);
            const invitations = await this.lobbyService.getInvitations(data.friendId);
            this.server.to(`user:${data.friendId}`).emit(LOBBY_EVENT_NAME.YOU_INVITED, invitations);
            
            if (callback) {
                callback({
                    success: true,
                    data: null,
                    message: "Вы успешно пригласили друга"
                });
            }
        } 
        catch (error) {
            handleError(error, callback);
        }
    }

    @UseGuards(WebSocketAuthGuard)
    @SubscribeMessage(LOBBY_EVENT_NAME.GET_FRIENDS_FOR_INVITE)
    async handleGetFriendsForInvite(client: Socket, data: null, callback: Function): Promise<void> {
        try {
            const userId = client.data.userId;

            const friendsForInvite = await this.lobbyService.getFriendsForInvite(userId);
            
            if (callback) {
                callback({
                    success: true,
                    data: friendsForInvite,
                    message: "Вы успешно получили список друзей для приглашения"
                });
            }
        } 
        catch (error) {
            handleError(error, callback);
        }
    }

    @UseGuards(WebSocketAuthGuard)
    @SubscribeMessage(LOBBY_EVENT_NAME.DECLINE_INVITATION)
    async handleDeclineInvitation(client: Socket, lobbyInvitation: LobbyInvitation, callback: Function): Promise<void> {
        try {
            const userId = client.data.userId;

            await this.lobbyService.deleteInvitation(lobbyInvitation);
            const invitations = await this.lobbyService.getInvitations(userId);
            this.server.to(`user:${lobbyInvitation.addresseeId}`).emit(LOBBY_EVENT_NAME.YOU_INVITED, invitations);
            
            if (callback) {
                callback({
                    success: true,
                    data: null,
                    message: "Вы успешно отклонили предложение"
                });
            }
        } 
        catch (error) {
            handleError(error, callback);
        }
    }

    @UseGuards(WebSocketAuthGuard)
    @SubscribeMessage(LOBBY_EVENT_NAME.JOIN_LOBBY_BY_INVITATION)
    async handleJoinLobbyByInvitation(client: Socket, invitationId: string, callback: Function): Promise<void> {
        try {
            const userId = client.data.userId;
            
            const invitation = await this.lobbyService.joinLobbyByInvitation(invitationId, userId);
            await this.lobbyService.joinLobby(invitation.lobbyId, userId);
            await this.lobbyService.deleteInvitation(invitation);

            const invitations = await this.lobbyService.getInvitations(userId);
            this.server.to(`user:${userId}`).emit(LOBBY_EVENT_NAME.YOU_INVITED, invitations);

            this.server.to(LOBBY_ROOMS_NAME.HALL).emit(LOBBY_EVENT_NAME.LOBBY_LIST_UPDATED)
            
            await client.join(`lobby-${invitation.lobbyId}`)   
            const currentLobby = await this.lobbyService.getLobbyById(invitation.lobbyId);
            this.server.to(`lobby-${invitation.lobbyId}`).emit(LOBBY_EVENT_NAME.LOBBY_UPDATE, currentLobby)

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
}