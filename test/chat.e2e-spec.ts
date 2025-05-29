import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

interface ChatListResponse {
  chats: unknown[];
}

describe('Chat Controller (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
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
      // Mock de token con rol commercial
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
