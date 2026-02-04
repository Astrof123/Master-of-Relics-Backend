import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
    dbHost: process.env.DB_HOST,
    dbPort: process.env.DB_PORT,
    dbUsername: process.env.DB_USERNAME,
    dbPassword: process.env.DB_PASSWORD,
    dbDatabase: process.env.DB_DATABASE,
    dbSynchronize: process.env.DB_SYNCHRONIZE,
    dbLogging: process.env.DB_LOGGING
}));