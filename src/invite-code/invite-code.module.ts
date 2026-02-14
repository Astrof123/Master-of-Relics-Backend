import { Module } from '@nestjs/common';
import { InviteCodeController } from './invite-code.controller';
import { InviteCodeService } from './invite-code.service';

@Module({
  controllers: [InviteCodeController],
  providers: [InviteCodeService]
})
export class InviteCodeModule {}
