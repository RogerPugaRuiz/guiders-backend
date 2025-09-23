import { Test, TestingModule } from '@nestjs/testing';
import { BffSessionAuthService } from '../bff-session-auth.service';

// Mock del módulo jose
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => 'mock-jwks'),
  jwtVerify: jest.fn(),
}));

import { jwtVerify } from 'jose';
const mockJwtVerify = jwtVerify as jest.MockedFunction<typeof jwtVerify>;

describe('BffSessionAuthService', () => {
  let service: BffSessionAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BffSessionAuthService],
    }).compile();

    service = module.get<BffSessionAuthService>(BffSessionAuthService);

    // Reset environment variables
    delete process.env.OIDC_ISSUER;
    delete process.env.OIDC_JWKS_URI;
    delete process.env.KEYCLOAK_AUDIENCE;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('extractBffSessionTokens', () => {
    it('debería extraer token de console_session correctamente', () => {
      const cookieHeader =
        'console_session=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.signature; other_cookie=value';

      const tokens = service.extractBffSessionTokens(cookieHeader);

      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toBe(
        'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.signature',
      );
    });

    it('debería extraer token de bff_sess con URL encoding', () => {
      const cookieHeader =
        'bff_sess=s%3AeyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.signature';

      const tokens = service.extractBffSessionTokens(cookieHeader);

      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toBe(
        's:eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.signature',
      );
    });

    it('debería extraer múltiples tokens BFF', () => {
      const cookieHeader =
        'console_session=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.sig1; admin_session=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5ODc2NTQzMjEwIn0.sig2';

      const tokens = service.extractBffSessionTokens(cookieHeader);

      expect(tokens).toHaveLength(2);
      expect(tokens).toContain(
        'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.sig1',
      );
      expect(tokens).toContain(
        'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5ODc2NTQzMjEwIn0.sig2',
      );
    });

    it('debería retornar array vacío si no hay cookies BFF', () => {
      const cookieHeader = 'other_cookie=value; another=test';

      const tokens = service.extractBffSessionTokens(cookieHeader);

      expect(tokens).toHaveLength(0);
    });

    it('debería retornar array vacío si el header es undefined', () => {
      const tokens = service.extractBffSessionTokens(undefined);

      expect(tokens).toHaveLength(0);
    });

    it('debería ignorar cookies que no parecen JWT', () => {
      const cookieHeader =
        'console_session=not-a-jwt; admin_session=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.sig';

      const tokens = service.extractBffSessionTokens(cookieHeader);

      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toBe(
        'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.sig',
      );
    });
  });

  describe('validateBffSession', () => {
    beforeEach(() => {
      // Setup environment variables para las pruebas
      process.env.OIDC_ISSUER = 'http://localhost:8080/realms/guiders';
      process.env.KEYCLOAK_AUDIENCE = 'account';
    });

    it('debería validar un token JWT válido y retornar información del usuario', async () => {
      const mockPayload = {
        sub: 'd9b32cfd-f838-4764-b03f-465ed59ce245',
        email: 'test1@demo.com',
        realm_access: {
          roles: ['commercial', 'admin'],
        },
      };

      mockJwtVerify.mockResolvedValueOnce({
        payload: mockPayload,
      });

      const token =
        'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.sig';
      const result = await service.validateBffSession(token);

      expect(result).toEqual({
        sub: 'd9b32cfd-f838-4764-b03f-465ed59ce245',
        email: 'test1@demo.com',
        roles: ['commercial', 'admin'],
      });

      expect(mockJwtVerify).toHaveBeenCalledWith(token, 'mock-jwks', {
        audience: 'account',
        issuer: 'http://localhost:8080/realms/guiders',
      });
    });

    it('debería retornar null si el token JWT es inválido', async () => {
      mockJwtVerify.mockRejectedValueOnce(new Error('Invalid token'));

      const token = 'invalid-token';
      const result = await service.validateBffSession(token);

      expect(result).toBeNull();
    });

    it('debería manejar payload sin roles', async () => {
      const mockPayload = {
        sub: 'd9b32cfd-f838-4764-b03f-465ed59ce245',
        email: 'test1@demo.com',
      };

      mockJwtVerify.mockResolvedValueOnce({
        payload: mockPayload,
      });

      const token = 'valid-token';
      const result = await service.validateBffSession(token);

      expect(result).toEqual({
        sub: 'd9b32cfd-f838-4764-b03f-465ed59ce245',
        email: 'test1@demo.com',
        roles: [],
      });
    });

    it('debería manejar payload sin email', async () => {
      const mockPayload = {
        sub: 'd9b32cfd-f838-4764-b03f-465ed59ce245',
        realm_access: {
          roles: ['visitor'],
        },
      };

      mockJwtVerify.mockResolvedValueOnce({
        payload: mockPayload,
      });

      const token = 'valid-token';
      const result = await service.validateBffSession(token);

      expect(result).toEqual({
        sub: 'd9b32cfd-f838-4764-b03f-465ed59ce245',
        email: undefined,
        roles: ['visitor'],
      });
    });
  });
});
