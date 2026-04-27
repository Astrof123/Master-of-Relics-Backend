import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class SocketConnectionService {
    constructor(
        private readonly redisService: RedisService,
    ) {}

    private readonly CONNECT_TTL = 60 * 60 * 24;

    async setPlayerOnline(userId: number) {
        await this.redisService.addToSet(
            "online:index",
            userId.toString(),
            this.CONNECT_TTL
        )
    }

    async setPlayerOffline(userId: number) {
        await this.redisService.removeFromSet(
            "online:index",
            userId.toString()
        )
    }

    async getOnlinePlayers() {
        const onlinePlayers = await this.redisService.getSetMembers(
            "online:index",
        )

        return onlinePlayers;
    }
}
