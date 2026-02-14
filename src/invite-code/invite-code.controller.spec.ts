import { Test, TestingModule } from '@nestjs/testing';
import { InviteCodeController } from './invite-code.controller';

describe('InviteCodeController', () => {
  let controller: InviteCodeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InviteCodeController],
    }).compile();

    controller = module.get<InviteCodeController>(InviteCodeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
