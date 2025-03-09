import { Test, TestingModule } from '@nestjs/testing';
import { CommercialController } from './commercial.controller';

describe('CommercialController', () => {
  let controller: CommercialController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommercialController],
    }).compile();

    controller = module.get<CommercialController>(CommercialController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
