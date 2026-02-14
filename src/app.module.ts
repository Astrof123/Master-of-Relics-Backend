import { Module } from '@nestjs/common';
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
import redisConfig from './config/redis.config';


@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
            load: [jwtConfig, databaseConfig, redisConfig]
        }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
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
        RedisModule,
        LobbyModule,
        SocketConnectionModule,
    ],
    controllers: [AppController],
    providers: [TokenService, AppService, JwtRefreshStrategy, JwtStrategy, JwtAuthGuard],
    exports: [TokenService, JwtModule, JwtAuthGuard, PassportModule]
})

export class AppModule {}
