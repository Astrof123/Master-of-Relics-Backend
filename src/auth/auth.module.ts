import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { TokenService } from './jwt/token.service';

@Module({
    controllers: [AuthController],
    providers: [AuthService, TokenService],
    imports: [
        TypeOrmModule.forFeature([User])
    ]
})
export class AuthModule {}
