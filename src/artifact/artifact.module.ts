import { Module } from '@nestjs/common';
import { ArtifactService } from './artifact.service';

@Module({
  providers: [ArtifactService]
})
export class ArtifactModule {}
