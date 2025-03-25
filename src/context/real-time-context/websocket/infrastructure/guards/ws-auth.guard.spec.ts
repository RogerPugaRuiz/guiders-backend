import { TokenVerifyService } from '../../../../shared/infrastructure/token-verify.service';
import { WsAuthGuard } from './ws-auth.guard';
import { Reflector } from '@nestjs/core';

describe('WsAuthGuard', () => {
  it('should be defined', () => {
    const reflector = {
      get: jest.fn(),
    } as unknown as Reflector;

    const tokenVerifyService = {
      verifyToken: jest.fn(),
    } as unknown as TokenVerifyService;
    expect(new WsAuthGuard(reflector, tokenVerifyService)).toBeDefined();
  });
});
