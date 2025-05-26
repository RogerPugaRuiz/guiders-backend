import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  // Aumentar el timeout para este test específico
  jest.setTimeout(30000);

  // Usar beforeAll en lugar de beforeEach para mejorar el rendimiento
  beforeAll(async () => {
    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();
      console.log('App initialized successfully');
    } catch (error) {
      console.error('Error initializing app:', error);
      throw error;
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
      console.log('App closed successfully');
    }
  });

  it('/ (GET)', async () => {
    try {
      const response = await request(app.getHttpServer())
        .get('/')
        .expect(200);
      
      expect(response.text).toContain('Hello World!');
    } catch (error) {
      console.error('Error in test:', error);
      throw error;
    }
  });
});
