import { Module } from '@nestjs/common';
import { PhaseService } from './phase.service';

@Module({
  providers: [PhaseService]
})
export class PhaseModule {}
