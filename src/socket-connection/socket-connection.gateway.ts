import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { WebSocketAuthMiddleware } from "src/auth/middlewares/websocket-auth.middleware";

@WebSocketGateway({
    middleware: []
})
export class SocketConnectionGateway implements OnGatewayConnection, OnGatewayDisconnect {
    constructor(
        private readonly webSocketAuthMiddleware: WebSocketAuthMiddleware,
    ) {}

    
    handleConnection(client: Socket) {
        console.log("Подключился:", client.id)
    }
    
    handleDisconnect(client: Socket) {
        console.log("Отключился:", client.id)
    }

    afterInit(server: Server) {
        server.use((socket: Socket, next) => {
            this.webSocketAuthMiddleware.use(socket, next);
        });
        
        console.log('WebSocket Middleware initialized');
    }
}