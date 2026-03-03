import { Test, TestingModule } from '@nestjs/testing';
import { PhaseService } from './phase.service';

describe('PhaseService', () => {
  let service: PhaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PhaseService],
    }).compile();

    service = module.get<PhaseService>(PhaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
