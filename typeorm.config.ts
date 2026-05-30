import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

config();

const isProduction = process.env.NODE_ENV === 'production';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'test_db',
  
  entities: isProduction
    ? ['dist/**/*.entity.js']
    : ['src/**/*.entity.ts'],
  
  migrations: isProduction
    ? ['dist/database/migrations/*.js']
    : ['src/migrations/*.ts'],
    
  synchronize: false,
  logging: true,
});