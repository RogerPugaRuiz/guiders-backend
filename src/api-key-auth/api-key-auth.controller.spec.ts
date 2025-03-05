import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeyAuthController } from './api-key-auth.controller';
import { ApiKeyAuthService } from './api-key-auth.service';
import { JwtService } from '@nestjs/jwt';

describe('ApiKeyAuthController', () => {
  let controller: ApiKeyAuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiKeyAuthController],
      providers: [ApiKeyAuthService, JwtService],
    }).compile();

    controller = module.get<ApiKeyAuthController>(ApiKeyAuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
