import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { OptionalAuthGuard } from '../optional-auth.guard';
import { TokenVerifyService, TokenPayload } from '../../token-verify.service';
import { VisitorSessionAuthService } from '../../services/visitor-session-auth.service';
import { BffSessionAuthService } from '../../services/bff-session-auth.service';

// Mock de resolveVisitorSessionId antes de importar el guard
jest.mock(
  '../../../../visitors-v2/infrastructure/http/visitor-session-cookie.util',
  () => ({
    resolveVisitorSessionId: jest.fn(),
  }),
);

import { resolveVisitorSessionId } from '../../../../visitors-v2/infrastructure/http/visitor-session-cookie.util';

describe('OptionalAuthGuard - BFF Authentication Integration', () => {
  let guard: OptionalAuthGuard;
  let mockTokenVerifyService: jest.Mocked<TokenVerifyService>;
  let mockVisitorSessionAuthService: jest.Mocked<VisitorSessionAuthService>;
  let mockBffSessionAuthService: jest.Mocked<BffSessionAuthService>;
  let mockResolveVisitorSessionId: jest.MockedFunction<
    typeof resolveVisitorSessionId
  >;

  const createMockTokenPayload = (): TokenPayload => ({
    sub: 'user123',
    typ: 'access',
    role: ['admin'],
    companyId: 'company123',
    username: 'testuser',
    email: 'test@example.com',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  });

  const createMockBffUserInfo = () => ({
    sub: 'bff-user-456',
    email: 'bff@test.com',
    roles: ['commercial'],
  });

  beforeEach(async () => {
    // Crear mocks con todas las propiedades necesarias
    mockTokenVerifyService = {
      verifyToken: jest.fn(),
    } as unknown as jest.Mocked<TokenVerifyService>;

    mockVisitorSessionAuthService = {
      validateSession: jest.fn(),
    } as unknown as jest.Mocked<VisitorSessionAuthService>;

    mockBffSessionAuthService = {
      validateBffSession: jest.fn(),
      extractBffSessionTokens: jest.fn(),
    } as unknown as jest.Mocked<BffSessionAuthService>;

    // Configurar mock de resolveVisitorSessionId
    mockResolveVisitorSessionId =
      resolveVisitorSessionId as jest.MockedFunction<
        typeof resolveVisitorSessionId
      >;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OptionalAuthGuard,
        {
          provide: TokenVerifyService,
          useValue: mockTokenVerifyService,
        },
        {
          provide: VisitorSessionAuthService,
          useValue: mockVisitorSessionAuthService,
        },
        {
          provide: BffSessionAuthService,
          useValue: mockBffSessionAuthService,
        },
      ],
    }).compile();

    guard = module.get<OptionalAuthGuard>(OptionalAuthGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockContext = (
    headers: Record<string, string> = {},
    cookies: Record<string, string> = {},
  ): ExecutionContext => {
    // Convertir objeto cookies a string de header Cookie
    const cookieHeader = Object.entries(cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');

    const request = {
      headers: {
        ...headers,
        ...(cookieHeader && { cookie: cookieHeader }),
      },
      cookies,
      user: undefined,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  };

  describe('cuando hay sesión BFF válida', () => {
    it('debe autenticar exitosamente con cookie console_session', async () => {
      // Arrange
      const bffToken = 'valid-bff-jwt-token';
      const mockBffUser = createMockBffUserInfo();
      const mockContext = createMockContext({}, { console_session: bffToken });

      mockTokenVerifyService.verifyToken.mockRejectedValue(
        new Error('No JWT Bearer token'),
      );
      mockBffSessionAuthService.extractBffSessionTokens.mockReturnValue([
        bffToken,
      ]);
      mockBffSessionAuthService.validateBffSession.mockResolvedValue(
        mockBffUser,
      );

      // Act
      const result = await guard.canActivate(mockContext);
      const request = mockContext.switchToHttp().getRequest();

      // Assert
      expect(result).toBe(true);
      expect(
        mockBffSessionAuthService.extractBffSessionTokens,
      ).toHaveBeenCalledWith('console_session=valid-bff-jwt-token');
      expect(mockBffSessionAuthService.validateBffSession).toHaveBeenCalledWith(
        bffToken,
      );
      expect(request.user).toEqual({
        id: mockBffUser.sub,
        roles: mockBffUser.roles,
        username: mockBffUser.email?.split('@')[0] || 'Usuario BFF',
        email: mockBffUser.email,
        companyId: undefined,
      });
    });

    it('debe autenticar usando token BFF válido desde cookie bff_sess', async () => {
      // Arrange
      const bffToken = 'another-valid-bff-jwt';
      const mockBffUser = createMockBffUserInfo();
      const mockContext = createMockContext({}, { bff_sess: bffToken });

      mockTokenVerifyService.verifyToken.mockRejectedValue(
        new Error('No JWT Bearer token'),
      );
      mockBffSessionAuthService.extractBffSessionTokens.mockReturnValue([
        bffToken,
      ]);
      mockBffSessionAuthService.validateBffSession.mockResolvedValue(
        mockBffUser,
      );

      // Act
      const result = await guard.canActivate(mockContext);
      const request = mockContext.switchToHttp().getRequest();

      // Assert
      expect(result).toBe(true);
      expect(
        mockBffSessionAuthService.extractBffSessionTokens,
      ).toHaveBeenCalledWith('bff_sess=another-valid-bff-jwt');
      expect(mockBffSessionAuthService.validateBffSession).toHaveBeenCalledWith(
        bffToken,
      );
      expect(request.user).toEqual({
        id: mockBffUser.sub,
        roles: mockBffUser.roles,
        username: mockBffUser.email?.split('@')[0] || 'Usuario BFF',
        email: mockBffUser.email,
        companyId: undefined,
      });
    });
  });

  describe('cuando la autenticación JWT tiene prioridad sobre BFF', () => {
    it('debe usar JWT en lugar de BFF cuando ambos están presentes', async () => {
      // Arrange
      const jwtToken = 'Bearer valid-jwt-token';
      const bffToken = 'valid-bff-jwt-token';
      const mockTokenPayload = createMockTokenPayload();
      const mockContext = createMockContext(
        { authorization: jwtToken },
        { console_session: bffToken },
      );

      mockTokenVerifyService.verifyToken.mockResolvedValue(mockTokenPayload);
      mockBffSessionAuthService.validateBffSession.mockResolvedValue(
        createMockBffUserInfo(),
      );

      // Act
      const result = await guard.canActivate(mockContext);
      const request = mockContext.switchToHttp().getRequest();

      // Assert
      expect(result).toBe(true);
      expect(mockTokenVerifyService.verifyToken).toHaveBeenCalledWith(
        'valid-jwt-token',
      );
      expect(
        mockBffSessionAuthService.validateBffSession,
      ).not.toHaveBeenCalled();
      expect(request.user).toEqual({
        id: mockTokenPayload.sub,
        roles: mockTokenPayload.role,
        username: mockTokenPayload.username,
        email: mockTokenPayload.email,
        companyId: mockTokenPayload.companyId,
      });
    });
  });

  describe('cuando BFF session es inválida', () => {
    it('debe continuar intentando otros métodos de autenticación', async () => {
      // Arrange
      const bffToken = 'invalid-bff-jwt-token';
      const visitorSessionId = 'visitor-session-123';
      const mockContext = createMockContext(
        {},
        {
          console_session: bffToken,
          guiders_session_id: visitorSessionId, // Cookie de visitante para que se llame al servicio
        },
      );

      mockTokenVerifyService.verifyToken.mockRejectedValue(
        new Error('No JWT Bearer token'),
      );
      mockBffSessionAuthService.extractBffSessionTokens.mockReturnValue([
        bffToken,
      ]);
      mockBffSessionAuthService.validateBffSession.mockResolvedValue(null);
      mockResolveVisitorSessionId.mockReturnValue(visitorSessionId);
      mockVisitorSessionAuthService.validateSession.mockResolvedValue(null);

      // Act
      const result = await guard.canActivate(mockContext);
      const request = mockContext.switchToHttp().getRequest();

      // Assert
      expect(result).toBe(true); // OptionalAuth permite sin autenticación
      expect(
        mockBffSessionAuthService.extractBffSessionTokens,
      ).toHaveBeenCalledWith(
        'console_session=invalid-bff-jwt-token; guiders_session_id=visitor-session-123',
      );
      expect(mockBffSessionAuthService.validateBffSession).toHaveBeenCalledWith(
        bffToken,
      );
      expect(
        mockVisitorSessionAuthService.validateSession,
      ).toHaveBeenCalledWith(visitorSessionId);
      expect(request.user).toBeUndefined();
    });
  });

  describe('cuando no hay cookies BFF', () => {
    it('debe continuar con otros métodos de autenticación', async () => {
      // Arrange
      const visitorSessionId = 'visitor-session-456';
      const mockContext = createMockContext(
        {},
        { guiders_session_id: visitorSessionId }, // Solo cookie de visitante, no BFF
      );

      mockTokenVerifyService.verifyToken.mockRejectedValue(
        new Error('No JWT Bearer token'),
      );
      mockBffSessionAuthService.extractBffSessionTokens.mockReturnValue([]);
      mockResolveVisitorSessionId.mockReturnValue(visitorSessionId);
      mockVisitorSessionAuthService.validateSession.mockResolvedValue(null);

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true); // OptionalAuth permite sin autenticación
      expect(
        mockBffSessionAuthService.extractBffSessionTokens,
      ).toHaveBeenCalledWith('guiders_session_id=visitor-session-456');
      expect(
        mockBffSessionAuthService.validateBffSession,
      ).not.toHaveBeenCalled();
      expect(
        mockVisitorSessionAuthService.validateSession,
      ).toHaveBeenCalledWith(visitorSessionId);
    });
  });
});
