import { Module } from '@nestjs/common';
import { InviteCodeController } from './invite-code.controller';
import { InviteCodeService } from './invite-code.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { InviteCode } from './entities/invite-code.entity';

@Module({
    imports: [TypeOrmModule.forFeature([InviteCode])],
    controllers: [InviteCodeController],
    providers: [InviteCodeService],
})
export class InviteCodeModule {}
