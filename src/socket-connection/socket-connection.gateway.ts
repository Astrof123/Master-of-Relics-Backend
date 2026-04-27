import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { WebSocketAuthMiddleware } from "src/auth/middlewares/websocket-auth.middleware";
import { SocketConnectionService } from "./socket-connection.service";
import { LOBBY_ROOMS_NAME } from "src/lobby/types/lobby-rooms-name";
import { LOBBY_EVENT_NAME } from "src/lobby/types/lobby-events-name";

@WebSocketGateway({
    middleware: []
})
export class SocketConnectionGateway implements OnGatewayConnection, OnGatewayDisconnect {
    constructor(
        private readonly webSocketAuthMiddleware: WebSocketAuthMiddleware,
        private readonly socketConnectionService: SocketConnectionService
    ) {}

    @WebSocketServer()
    server!: Server;
    
    async handleConnection(client: Socket) {
        const userId = client.data.userId;
        console.log(`Подключился пользователь (${userId}):`, client.id);
        await this.socketConnectionService.setPlayerOnline(userId);
        const onlinePlayers = await this.socketConnectionService.getOnlinePlayers();
        this.server.to(LOBBY_ROOMS_NAME.HALL).emit(LOBBY_EVENT_NAME.COUNT_ONLINE_PLAYERS_UPDATED, onlinePlayers.length)
    }
    
    async handleDisconnect(client: Socket) {
        const userId = client.data.userId;
        console.log(`Отключился пользователь (${userId}):`, client.id);
        await this.socketConnectionService.setPlayerOffline(userId);
        const onlinePlayers = await this.socketConnectionService.getOnlinePlayers();
        this.server.to(LOBBY_ROOMS_NAME.HALL).emit(LOBBY_EVENT_NAME.COUNT_ONLINE_PLAYERS_UPDATED, onlinePlayers.length)
    }

    afterInit(server: Server) {
        server.use((socket: Socket, next) => {
            this.webSocketAuthMiddleware.use(socket, next);
        });
        
        console.log('WebSocket Middleware initialized');
    }
}