import { Test, TestingModule } from '@nestjs/testing';
import { TokenVerifyService } from '../../../shared/infrastructure/token-verify.service';

describe('TokenVerifyService', () => {
  let service: TokenVerifyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TokenVerifyService],
    }).compile();

    service = module.get<TokenVerifyService>(TokenVerifyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
