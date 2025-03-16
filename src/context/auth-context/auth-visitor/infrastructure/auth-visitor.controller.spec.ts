import { Test, TestingModule } from '@nestjs/testing';
import { AuthVisitorController } from './auth-visitor.controller';

describe('AuthVisitorController', () => {
  let controller: AuthVisitorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthVisitorController],
    }).compile();

    controller = module.get<AuthVisitorController>(AuthVisitorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
