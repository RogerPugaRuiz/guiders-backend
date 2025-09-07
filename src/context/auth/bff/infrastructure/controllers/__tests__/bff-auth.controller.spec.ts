import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { BFFAuthController } from '../bff-auth.controller';
import { BFFAuthService } from '../../bff-auth.service';
import { Request, Response } from 'express';

describe('BFFAuthController', () => {
  let controller: BFFAuthController;
  let bffAuthService: jest.Mocked<BFFAuthService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(async () => {
    const mockBffAuthService = {
      loginWithKeycloak: jest.fn(),
      refreshToken: jest.fn(),
      logout: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BFFAuthController],
      providers: [
        {
          provide: BFFAuthService,
          useValue: mockBffAuthService,
        },
      ],
    }).compile();

    controller = module.get<BFFAuthController>(BFFAuthController);
    bffAuthService = module.get(BFFAuthService);

    mockRequest = {
      cookies: {},
      user: { sub: '123', email: 'test@example.com', roles: ['user'] },
    };

    mockResponse = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const loginDto = {
        username: 'test@example.com',
        password: 'password123',
      };
      const mockUser = {
        sub: '123',
        email: 'test@example.com',
        roles: ['user'],
      };

      bffAuthService.loginWithKeycloak.mockResolvedValue({
        success: true,
        user: mockUser,
      });

      const result = await controller.login(loginDto, mockResponse as Response);

      expect(result).toEqual({
        success: true,
        message: 'Autenticación exitosa',
        user: mockUser,
      });
      expect(bffAuthService.loginWithKeycloak).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
        mockResponse,
      );
    });

    it('should throw UnauthorizedException with invalid credentials', async () => {
      const loginDto = {
        username: 'test@example.com',
        password: 'wrongpassword',
      };

      bffAuthService.loginWithKeycloak.mockRejectedValue(
        new UnauthorizedException('Credenciales inválidas'),
      );

      await expect(
        controller.login(loginDto, mockResponse as Response),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      mockRequest.cookies = { refresh_token: 'valid-refresh-token' };
      bffAuthService.refreshToken.mockResolvedValue({ success: true });

      const result = await controller.refreshToken(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(result).toEqual({
        success: true,
        message: 'Token renovado exitosamente',
      });
      expect(bffAuthService.refreshToken).toHaveBeenCalledWith(
        'valid-refresh-token',
        mockResponse,
      );
    });

    it('should throw UnauthorizedException when refresh token is missing', async () => {
      mockRequest.cookies = {};

      await expect(
        controller.refreshToken(
          mockRequest as Request,
          mockResponse as Response,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should logout successfully', () => {
      const result = controller.logout(
        mockResponse as Response,
        mockRequest as any,
      );

      expect(result).toEqual({
        success: true,
        message: 'Sesión cerrada exitosamente',
      });
      expect(bffAuthService.logout).toHaveBeenCalledWith(mockResponse);
    });
  });

  describe('getMe', () => {
    it('should return user information', () => {
      const result = controller.getMe(mockRequest as any);

      expect(result).toEqual({
        success: true,
        user: mockRequest.user,
      });
    });

    it('should throw UnauthorizedException when user is not in request', () => {
      const requestWithoutUser = { ...mockRequest };
      delete requestWithoutUser.user;

      expect(() => controller.getMe(requestWithoutUser as any)).toThrow(
        UnauthorizedException,
      );
    });
  });
});
