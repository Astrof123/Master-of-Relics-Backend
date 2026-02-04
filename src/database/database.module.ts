import { Module } from '@nestjs/common';
import { TypeOrmModule } from "@nestjs/typeorm"
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get('database.dbHost'),
                port: +configService.get('database.dbPort'),
                username: configService.get('database.dbUsername'),
                password: configService.get('database.dbPassword'),
                database: configService.get('database.dbDatabase'),
                entities: [__dirname + '/../**/*.entity{.ts,.js}'],
                synchronize: configService.get('database.dbSynchronize') === 'true',
                logging: configService.get('database.dbLogging') === 'true',
                migrations: [__dirname + '/migrations/*{.ts,.js}'],
                migrationsRun: false,
                cli: {
                    migrationsDir: 'src/database/migrations',
                },

                ssl: configService.get('NODE_ENV') === 'production' 
                ? { rejectUnauthorized: false } 
                : false,
            }),
        })
    ]
})
export class DatabaseModule {}
