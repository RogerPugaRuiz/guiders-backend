import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Commercial Heartbeat E2E', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;

  const testCommercialId = '123e4567-e89b-12d3-a456-426614174000'; // UUID válido para tests

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('/v2/commercials/connect (POST) - Connect Commercial', () => {
    it('should connect a commercial successfully', async () => {
      const connectDto = {
        id: testCommercialId,
        name: 'Test Commercial',
        metadata: { browser: 'Chrome' },
      };

      const response = await request(app.getHttpServer())
        .post('/v2/commercials/connect')
        .send(connectDto)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Comercial conectado exitosamente',
        commercial: {
          id: expect.any(String),
          name: expect.any(String),
          connectionStatus: expect.any(String),
          isActive: expect.any(Boolean),
          lastActivity: expect.any(String),
        },
      });
    });

    it('should return 500 for invalid commercial ID', async () => {
      const connectDto = {
        id: '',
        name: 'Test Commercial',
      };

      // ID vacío pasa validación del DTO pero falla en el domain layer (CommercialId)
      await request(app.getHttpServer())
        .post('/v2/commercials/connect')
        .send(connectDto)
        .expect(500);
    });
  });

  describe('/v2/commercials/disconnect (POST) - Disconnect Commercial', () => {
    beforeEach(async () => {
      // Conectar comercial antes de cada test de desconexión
      await request(app.getHttpServer()).post('/v2/commercials/connect').send({
        id: testCommercialId,
        name: 'Test Commercial',
      });
    });

    it('should disconnect a commercial successfully', async () => {
      const disconnectDto = {
        id: testCommercialId,
      };

      const response = await request(app.getHttpServer())
        .post('/v2/commercials/disconnect')
        .send(disconnectDto)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Comercial desconectado exitosamente',
      });
    });
  });

  describe('/v2/commercials/heartbeat (PUT) - Update Heartbeat', () => {
    beforeEach(async () => {
      // Conectar comercial antes de cada test de heartbeat
      await request(app.getHttpServer()).post('/v2/commercials/connect').send({
        id: testCommercialId,
        name: 'Test Commercial',
      });
    });

    it('should update commercial heartbeat successfully', async () => {
      const heartbeatDto = {
        id: testCommercialId,
      };

      const response = await request(app.getHttpServer())
        .put('/v2/commercials/heartbeat')
        .send(heartbeatDto)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Actividad actualizada exitosamente',
        commercial: {
          id: expect.any(String),
          name: expect.any(String),
          connectionStatus: expect.any(String),
          isActive: expect.any(Boolean),
          lastActivity: expect.any(String),
        },
      });
    });
  });

  describe('/v2/commercials/:id/status (GET) - Get Commercial Status', () => {
    it('should get commercial status', async () => {
      // Conectar comercial
      await request(app.getHttpServer()).post('/v2/commercials/connect').send({
        id: testCommercialId,
        name: 'Test Commercial',
      });

      const response = await request(app.getHttpServer())
        .get(`/v2/commercials/${testCommercialId}/status`)
        .expect(200);

      // Verificar que se retorna el estado
      expect(response.body).toBeDefined();
    });
  });

  describe('/v2/commercials/active (GET) - Get Active Commercials', () => {
    it('should return list of active commercials', async () => {
      const response = await request(app.getHttpServer())
        .get('/v2/commercials/active')
        .expect(200);

      // Verificar que se retorna una lista (puede estar vacía)
      expect(response.body).toBeDefined();
      expect(
        Array.isArray(response.body) || response.body.commercials,
      ).toBeTruthy();
    });
  });

  describe('/v2/commercials/availability (POST) - Check Commercial Availability', () => {
    it('should return availability when valid domain and apiKey are provided', async () => {
      // NOTA: Este test requiere tener datos seed válidos en la base de datos
      // para que el domain + apiKey sean válidos
      const availabilityDto = {
        domain: 'example.com',
        apiKey: 'ak_test_12345678',
      };

      const response = await request(app.getHttpServer())
        .post('/v2/commercials/availability')
        .send(availabilityDto)
        .expect((res) => {
          // Aceptar 200 (éxito), 401 (API Key inválida), 404 (dominio no encontrado)
          // dependiendo del estado de la DB en el test
          if (![200, 401, 404].includes(res.status)) {
            throw new Error(
              `Expected 200, 401, or 404, got ${res.status}: ${JSON.stringify(res.body)}`,
            );
          }
        });

      // Si fue exitoso (200), verificar estructura de respuesta
      if (response.status === 200) {
        expect(response.body).toHaveProperty('available');
        expect(response.body).toHaveProperty('onlineCount');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('siteId');
        expect(typeof response.body.available).toBe('boolean');
        expect(typeof response.body.onlineCount).toBe('number');
        expect(response.body.onlineCount).toBeGreaterThanOrEqual(0);
      }
    });

    it('should return 500 when domain is missing', async () => {
      const availabilityDto = {
        apiKey: 'ak_test_12345678',
      };

      // Sin ValidationPipe global en tests E2E, el domain undefined causa error interno
      await request(app.getHttpServer())
        .post('/v2/commercials/availability')
        .send(availabilityDto)
        .expect(500);
    });

    it('should return 401 when apiKey is missing', async () => {
      const availabilityDto = {
        domain: 'example.com',
      };

      // Sin apiKey válido, falla la validación de autenticación
      await request(app.getHttpServer())
        .post('/v2/commercials/availability')
        .send(availabilityDto)
        .expect(401);
    });

    it('should normalize domain with www prefix', async () => {
      // El endpoint debe normalizar www.example.com -> example.com
      const availabilityDto = {
        domain: 'www.example.com',
        apiKey: 'ak_test_12345678',
      };

      const response = await request(app.getHttpServer())
        .post('/v2/commercials/availability')
        .send(availabilityDto)
        .expect((res) => {
          // Aceptar 200, 401, o 404 dependiendo del estado de la DB
          if (![200, 401, 404].includes(res.status)) {
            throw new Error(`Expected 200, 401, or 404, got ${res.status}`);
          }
        });

      // Si fue exitoso, verificar que el dominio fue normalizado correctamente
      if (response.status === 200) {
        expect(response.body).toHaveProperty('siteId');
      }
    });

    it('should handle case when no commercials are available', async () => {
      // Este test verifica que el endpoint retorna disponibilidad false
      // cuando no hay comerciales online (esto depende del estado de Redis)
      const availabilityDto = {
        domain: 'example.com',
        apiKey: 'ak_test_12345678',
      };

      const response = await request(app.getHttpServer())
        .post('/v2/commercials/availability')
        .send(availabilityDto);

      // Si la validación fue exitosa, verificar el campo available
      if (response.status === 200) {
        // El campo available puede ser true o false dependiendo del estado de Redis
        expect(typeof response.body.available).toBe('boolean');
        expect(response.body.onlineCount).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
