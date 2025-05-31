import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import { UnauthorizedException } from '@nestjs/common';
import { TokenVerifyService } from '../token-verify.service';
import { of } from 'rxjs';
import { AxiosResponse } from 'axios';
import * as jwt from 'jsonwebtoken';

describe('TokenVerifyService', () => {
  let service: TokenVerifyService;
  let configService: jest.Mocked<ConfigService>;
  let jwtService: jest.Mocked<JwtService>;
  let httpService: jest.Mocked<HttpService>;

  const mockToken = 'mock.jwt.token';
  const mockPayload = {
    sub: 'user-123',
    typ: 'access',
    role: ['user'],
    iat: 1640995200,
    exp: 1641081600,
  };

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    const mockJwtService = {
      decode: jest.fn(),
      verify: jest.fn(),
    };

    const mockHttpService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenVerifyService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<TokenVerifyService>(TokenVerifyService);
    configService = module.get(ConfigService);
    jwtService = module.get(JwtService);
    httpService = module.get(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyToken', () => {
    it('should verify token successfully for non-visitor roles', async () => {
      // Arrange
      const decodedToken = {
        header: {},
        payload: mockPayload,
      };
      jwtService.decode.mockReturnValue(decodedToken);
      jwtService.verify.mockReturnValue(mockPayload);
      process.env.GLOBAL_TOKEN_SECRET = 'test-secret';

      // Act
      const result = await service.verifyToken(mockToken);

      // Assert
      expect(result).toEqual(mockPayload);
      expect(jwtService.decode).toHaveBeenCalledWith(mockToken, { complete: true });
      expect(jwtService.verify).toHaveBeenCalledWith(mockToken, {
        secret: 'test-secret',
      });
    });

    it('should verify visitor token with JWKS', async () => {
      // Arrange
      const visitorPayload = { ...mockPayload, role: ['visitor'] };
      const decodedToken = {
        header: { kid: 'test-kid' },
        payload: visitorPayload,
      };
      const jwksResponse = {
        keys: [
          {
            kty: 'RSA',
            kid: 'test-kid',
            use: 'sig',
            alg: 'RS256',
            n: 'test-n',
            e: 'AQAB',
          },
        ],
      };

      jwtService.decode.mockReturnValue(decodedToken);
      configService.get.mockReturnValue('https://test-app.com');
      httpService.get.mockReturnValue(of({
        data: jwksResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      } as AxiosResponse));
      jwtService.verify.mockReturnValue(visitorPayload);

      // Act
      const result = await service.verifyToken(mockToken);

      // Assert
      expect(result).toEqual(visitorPayload);
      expect(httpService.get).toHaveBeenCalledWith('https://test-app.com/jwks');
      expect(jwtService.verify).toHaveBeenCalledWith(mockToken, {
        algorithms: ['RS256'],
        secret: expect.any(String),
      });
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      // Arrange
      jwtService.decode.mockReturnValue(null);

      // Act & Assert
      await expect(service.verifyToken(mockToken)).rejects.toThrow(
        new UnauthorizedException('Token inválido'),
      );
    });

    it('should throw UnauthorizedException when visitor token has no kid', async () => {
      // Arrange
      const visitorPayload = { ...mockPayload, role: ['visitor'] };
      const decodedToken = {
        header: {}, // No kid
        payload: visitorPayload,
      };
      jwtService.decode.mockReturnValue(decodedToken);

      // Act & Assert
      await expect(service.verifyToken(mockToken)).rejects.toThrow(
        new UnauthorizedException('Token inválido'),
      );
    });

    it('should throw UnauthorizedException when kid not found in JWKS', async () => {
      // Arrange
      const visitorPayload = { ...mockPayload, role: ['visitor'] };
      const decodedToken = {
        header: { kid: 'unknown-kid' },
        payload: visitorPayload,
      };
      const jwksResponse = {
        keys: [
          {
            kty: 'RSA',
            kid: 'different-kid',
            use: 'sig',
            alg: 'RS256',
            n: 'test-n',
            e: 'AQAB',
          },
        ],
      };

      jwtService.decode.mockReturnValue(decodedToken);
      configService.get.mockReturnValue('https://test-app.com');
      httpService.get.mockReturnValue(of({
        data: jwksResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      } as AxiosResponse));

      // Act & Assert
      await expect(service.verifyToken(mockToken)).rejects.toThrow(
        new UnauthorizedException('Token inválido'),
      );
    });

    it('should handle TokenExpiredError', async () => {
      // Arrange
      const decodedToken = {
        header: {},
        payload: mockPayload,
      };
      jwtService.decode.mockReturnValue(decodedToken);
      jwtService.verify.mockImplementation(() => {
        throw new jwt.TokenExpiredError('Token expired', new Date());
      });

      // Act & Assert
      await expect(service.verifyToken(mockToken)).rejects.toThrow(
        new UnauthorizedException('Token expirado'),
      );
    });

    it('should handle generic JWT errors', async () => {
      // Arrange
      const decodedToken = {
        header: {},
        payload: mockPayload,
      };
      jwtService.decode.mockReturnValue(decodedToken);
      jwtService.verify.mockImplementation(() => {
        throw new Error('Generic JWT error');
      });

      // Act & Assert
      await expect(service.verifyToken(mockToken)).rejects.toThrow(
        new UnauthorizedException('Token inválido'),
      );
    });

    it('should handle HTTP errors when fetching JWKS', async () => {
      // Arrange
      const visitorPayload = { ...mockPayload, role: ['visitor'] };
      const decodedToken = {
        header: { kid: 'test-kid' },
        payload: visitorPayload,
      };

      jwtService.decode.mockReturnValue(decodedToken);
      configService.get.mockReturnValue('https://test-app.com');
      httpService.get.mockImplementation(() => {
        throw new Error('HTTP error');
      });

      // Act & Assert
      await expect(service.verifyToken(mockToken)).rejects.toThrow(
        new UnauthorizedException('Token inválido'),
      );
    });

    it('should handle token with companyId', async () => {
      // Arrange
      const payloadWithCompany = {
        ...mockPayload,
        companyId: 'company-123',
      };
      const decodedToken = {
        header: {},
        payload: payloadWithCompany,
      };
      jwtService.decode.mockReturnValue(decodedToken);
      jwtService.verify.mockReturnValue(payloadWithCompany);
      process.env.GLOBAL_TOKEN_SECRET = 'test-secret';

      // Act
      const result = await service.verifyToken(mockToken);

      // Assert
      expect(result).toEqual(payloadWithCompany);
      expect(result.companyId).toBe('company-123');
    });
  });
});