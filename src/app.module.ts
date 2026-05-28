import { forwardRef, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import jwtConfig from './config/jwt.config';
import databaseConfig from './config/database.config';
import { JwtModule } from '@nestjs/jwt';
import { TokenService } from './auth/jwt/token.service';
import { JwtRefreshStrategy } from './auth/strategies/jwt-refresh.strategy';
import { JwtStrategy } from './auth/strategies/jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { InviteCodeModule } from './invite-code/invite-code.module';
import { RedisModule } from './redis/redis.module';
import { LobbyModule } from './lobby/lobby.module';
import { SocketConnectionModule } from './socket-connection/socket-connection.module';
import { GameStateModule } from './game-state/game-state.module';
import { ArtifactModule } from './artifact/artifact.module';
import { DraftModule } from './draft/draft.module';
import { PhaseModule } from './phase/phase.module';
import { GameMechanicsModule } from './game-mechanics/game-mechanics.module';
import { ActionModule } from './action/action.module';
import { CollectionModule } from './collection/collection.module';
import { SpellModule } from './spell/spell.module';
import redisConfig from './config/redis.config';
import { makeCounterProvider, makeHistogramProvider, PrometheusModule } from '@willsoto/nestjs-prometheus';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { HttpMetricsInterceptor } from './common/http-metrics.interceptor';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
            load: [jwtConfig, databaseConfig, redisConfig],
        }),
        PrometheusModule.register({
            path: '/metrics',
            defaultMetrics: {
                enabled: true,
            },
        }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        RedisModule,
        DatabaseModule,
        UsersModule,
        AuthModule,
        JwtModule.registerAsync({
            global: true,
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get('jwt.accessSecret'),
                signOptions: {
                    expiresIn: configService.get('jwt.accessExpiresIn'),
                },
            }),
        }),
        InviteCodeModule,
        ArtifactModule,
        GameStateModule,
        LobbyModule,
        SocketConnectionModule,
        DraftModule,
        PhaseModule,
        GameMechanicsModule,
        ActionModule,
        CollectionModule,
        SpellModule,
    ],
    controllers: [AppController],
    providers: [
        TokenService,
        AppService,
        JwtRefreshStrategy,
        JwtStrategy,
        JwtAuthGuard,
        makeCounterProvider({
            name: 'http_requests_total',
            help: 'Total number of HTTP requests',
            labelNames: ['method', 'route', 'status'],
        }),
        makeHistogramProvider({
            name: 'http_request_duration_seconds',
            help: 'HTTP request duration in seconds',
            labelNames: ['method', 'route', 'status'],
            buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
        }),
        {
            provide: APP_INTERCEPTOR,
            useClass: HttpMetricsInterceptor,
        },
    ],
    exports: [TokenService, JwtModule, JwtAuthGuard, PassportModule],
})
export class AppModule {}
