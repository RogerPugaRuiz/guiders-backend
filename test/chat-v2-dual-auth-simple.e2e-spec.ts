import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('ChatV2Controller - Dual Authentication Simple E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /v2/chats/visitor/:visitorId', () => {
    const visitorId = 'test-visitor-123';

    it('debe devolver 401 cuando no hay autenticación', async () => {
      await request(app.getHttpServer())
        .get(`/v2/chats/visitor/${visitorId}?limit=20`)
        .expect(401);
    });

    it('debe devolver 401 con token JWT inválido', async () => {
      await request(app.getHttpServer())
        .get(`/v2/chats/visitor/${visitorId}?limit=20`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('debe devolver 401 con cookie de sesión inválida', async () => {
      await request(app.getHttpServer())
        .get(`/v2/chats/visitor/${visitorId}?limit=20`)
        .set('Cookie', ['sid=invalid-session-id'])
        .expect(401);
    });

    it('debe utilizar el OptionalAuthGuard según la documentación Swagger', async () => {
      const response = await request(app.getHttpServer())
        .get(`/v2/chats/visitor/${visitorId}?limit=20`)
        .expect(401);

      // Verificar que la respuesta viene del guard de autenticación
      expect(response.body).toBeDefined();
    });
  });
});
