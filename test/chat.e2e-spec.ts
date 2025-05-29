import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  UnauthorizedException,
  ForbiddenException,
  ExecutionContext,
} from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { ChatController } from '../src/context/conversations/chat/infrastructure/chat.controller';
import { QueryBus } from '@nestjs/cqrs';
import { ChatService } from '../src/context/conversations/chat/infrastructure/chat.service';
import { AuthGuard } from '../src/context/shared/infrastructure/guards/auth.guard';
import { RolesGuard } from '../src/context/shared/infrastructure/guards/role.guard';

interface ChatListResponse {
  chats: unknown[];
}

interface MockUser {
  id: string;
  roles: string[];
  username: string;
  email: string;
}

interface MockRequest {
  headers: {
    authorization?: string;
  };
  user?: MockUser;
}

// Mock para AuthGuard que simula autenticación exitosa
class MockAuthGuard {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<MockRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('No se a encontrado el token');
    }

    // Determinar el rol basado en el token mock
    let roles = ['commercial']; // Default
    if (authHeader.includes('visitor-token')) {
      roles = ['visitor'];
    }

    // Simular usuario autenticado
    request.user = {
      id: 'test-user-id',
      roles: roles,
      username: 'test-user',
      email: 'test@example.com',
    };

    return true;
  }
}

// Mock para RolesGuard que verifica roles
class MockRolesGuard {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<MockRequest>();
    const user = request.user;

    // Si no hay usuario, el AuthGuard ya debería haber fallado
    if (!user) {
      throw new ForbiddenException('Forbidden');
    }

    // Verificar si el usuario tiene rol 'commercial'
    if (!user.roles.includes('commercial')) {
      throw new ForbiddenException('Forbidden');
    }

    return true;
  }
}

describe('Chat Controller (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        {
          provide: QueryBus,
          useValue: {
            execute: jest.fn().mockResolvedValue({ chats: [] }),
          },
        },
        {
          provide: ChatService,
          useValue: {
            startChat: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useClass(MockAuthGuard)
      .overrideGuard(RolesGuard)
      .useClass(MockRolesGuard)
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('GET /chats', () => {
    it('debe rechazar acceso sin token de autenticación', () => {
      return request(app.getHttpServer()).get('/chats').expect(401);
    });

    it('debe rechazar acceso con rol no commercial', async () => {
      // Mock de token con rol visitor
      const mockToken = 'mock-visitor-token';

      return request(app.getHttpServer())
        .get('/chats')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(403); // Forbidden - role insuficiente
    });

    it('debe permitir acceso con rol commercial y retornar lista de chats', async () => {
      const mockToken = 'mock-commercial-token';

      return request(app.getHttpServer())
        .get('/chats')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('chats');
          expect(Array.isArray((res.body as ChatListResponse).chats)).toBe(
            true,
          );
        });
    });

    it('debe soportar parámetro limit', async () => {
      const mockToken = 'mock-commercial-token';

      return request(app.getHttpServer())
        .get('/chats?limit=10')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('chats');
          expect(Array.isArray((res.body as ChatListResponse).chats)).toBe(
            true,
          );
        });
    });

    it('debe soportar parámetro include', async () => {
      const mockToken = 'mock-commercial-token';

      return request(app.getHttpServer())
        .get('/chats?include=lastMessage,timestamp')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('chats');
          expect(Array.isArray((res.body as ChatListResponse).chats)).toBe(
            true,
          );
        });
    });

    it('debe soportar múltiples parámetros', async () => {
      const mockToken = 'mock-commercial-token';

      return request(app.getHttpServer())
        .get('/chats?limit=5&include=lastMessage,timestamp')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('chats');
          expect(Array.isArray((res.body as ChatListResponse).chats)).toBe(
            true,
          );
        });
    });
  });
});
