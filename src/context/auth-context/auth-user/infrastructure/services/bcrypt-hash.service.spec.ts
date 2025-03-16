import { Test, TestingModule } from '@nestjs/testing';
import { BcryptHashService } from './bcrypt-hash.service';

describe('BcryptHashService', () => {
  let service: BcryptHashService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BcryptHashService],
    }).compile();

    service = module.get<BcryptHashService>(BcryptHashService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
