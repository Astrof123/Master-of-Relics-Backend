import { Module, Global, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import redisConfig from '../config/redis.config';
import { RedisService } from './redis.service';

@Global()
@Module({
    imports: [ConfigModule.forFeature(redisConfig)],
    providers: [
        {
            provide: 'REDIS_CLIENT',
            useFactory: (configService: ConfigService) => {
                const logger = new Logger('Redis');
                
                const redisOptions = {
                    host: configService.get('redis.host'),
                    port: configService.get('redis.port'),
                    password: configService.get('redis.password'),
                    db: configService.get('redis.db'),
                    retryStrategy: (times: number) => {
                        const delay = Math.min(times * 50, 2000);
                        return delay;
                    },
                    maxRetriesPerRequest: 3,
                    enableReadyCheck: true,
                    connectTimeout: 10000,
                };

                logger.log(`Connecting to Redis at ${redisOptions.host}:${redisOptions.port}`);
                
                const client = new Redis(redisOptions);

                client.on('connect', () => {
                    logger.log('Redis connected successfully');
                });

                client.on('error', (error) => {
                    logger.error('Redis connection error:', error);
                });

                client.on('close', () => {
                    logger.warn('Redis connection closed');
                });

                return client;
            },
            inject: [ConfigService],
        },
        RedisService,
    ],
    exports: [RedisService],
})
export class RedisModule {

}
