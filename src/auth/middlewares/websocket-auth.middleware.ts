import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { WsException } from '@nestjs/websockets';
import { TokenService } from '../jwt/token.service';

@Injectable()
export class WebSocketAuthMiddleware {
    constructor(private readonly tokenService: TokenService) {}

    async use(socket: Socket, next: (err?: Error) => void) {
        try {
            const token = this.extractToken(socket);
            
            if (!token) {
                throw new WsException('Требуется аутентификация');
            }

            const payload = await this.tokenService.verifyAccessToken(token);
            
            if (!payload) {
                throw new WsException('Невалидный токен');
            }

            socket.data.userId = payload.sub;

            next();
        } catch (error) {
            if (error instanceof WsException) {
                next(error);
            } else {
                next(new WsException('Ошибка аутентификации'));
            }
        }
    }

    private extractToken(socket: Socket): string | null {
        if (socket.handshake.auth?.token) {
            return socket.handshake.auth.token;
        }

        return null;
    }
}