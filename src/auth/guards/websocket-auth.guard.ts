import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class WebSocketAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const client = context.switchToWs().getClient();
        
        if (!client.data?.userId) {
            throw new WsException('Неавторизованный доступ');
        }

        return true;
    }
}