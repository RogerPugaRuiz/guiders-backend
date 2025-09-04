import { Test, TestingModule } from '@nestjs/testing';
import { SimpleOidcController } from '../infrastructure/controllers/simple-oidc.controller';
import { OidcAuthGuard } from '../infrastructure/guards/oidc-auth.guard';

describe('SimpleOidcController', () => {
  let controller: SimpleOidcController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SimpleOidcController],
      providers: [
        {
          provide: OidcAuthGuard,
          useValue: {
            canActivate: jest.fn(() => true),
          },
        },
      ],
    }).compile();

    controller = module.get<SimpleOidcController>(SimpleOidcController);
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('callback', () => {
    it('debería manejar el callback OIDC exitosamente', () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'oidc',
        accessToken: 'mock-access-token',
      };

      const mockReq = { user: mockUser } as any;
      const mockRes = {
        json: jest.fn(),
      } as any;

      controller.callback(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Autenticación OIDC exitosa',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          provider: mockUser.provider,
        },
        accessToken: 'temporary-jwt-token',
      });
    });
  });

  describe('getProfile', () => {
    it('debería devolver el perfil del usuario', () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'oidc',
        accessToken: 'mock-access-token',
      };

      const mockReq = { user: mockUser } as any;

      const result = controller.getProfile(mockReq);

      expect(result).toEqual({
        user: mockUser,
      });
    });
  });
});
