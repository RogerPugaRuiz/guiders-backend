import { Test, TestingModule } from '@nestjs/testing';
import { AuthVisitorService } from './auth-visitor.service';

describe('AuthVisitorService', () => {
  let service: AuthVisitorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthVisitorService],
    }).compile();

    service = module.get<AuthVisitorService>(AuthVisitorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
