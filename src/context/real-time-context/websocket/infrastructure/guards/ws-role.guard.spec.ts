import { Reflector } from '@nestjs/core';
import { WsRolesGuard } from './ws-role.guard';

describe('WsRoleGuard', () => {
  it('should be defined', () => {
    const reflector = {
      get: jest.fn(),
    } as unknown as Reflector;

    expect(new WsRolesGuard(reflector)).toBeDefined();
  });
});
