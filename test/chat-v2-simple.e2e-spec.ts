import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ChatV2Controller } from '../src/context/conversations-v2/infrastructure/controllers/chat-v2.controller';
import { QueryBus, CommandBus, CqrsModule } from '@nestjs/cqrs';
import { AuthGuard } from '../src/context/shared/infrastructure/guards/auth.guard';
import { RolesGuard } from '../src/context/shared/infrastructure/guards/role.guard';
import { GetChatsWithFiltersQuery } from '../src/context/conversations-v2/application/queries/get-chats-with-filters.query';

describe('ChatV2Controller Simple (e2e)', () => {
  let app: INestApplication;
  let queryBus: QueryBus;

  beforeEach(async () => {
    const mockQueryBus = {
      execute: jest.fn().mockResolvedValue({
        chats: [
          {
            id: 'test-chat-1',
            status: 'ACTIVE',
            visitorInfo: {
              id: 'visitor-1',
              name: 'Test Visitor',
              email: 'test@example.com',
            },
            priority: 'MEDIUM',
            createdAt: new Date().toISOString(),
            lastMessageDate: new Date().toISOString(),
          },
        ],
        total: 1,
        hasMore: false,
        nextCursor: null,
      }),
      register: jest.fn(),
      bind: jest.fn(),
    };

    const mockCommandBus = {
      execute: jest.fn(),
      register: jest.fn(),
      bind: jest.fn(),
    };

    const mockAuthGuard = {
      canActivate: jest.fn((context) => {
        const request = context.switchToHttp().getRequest();
        request.user = {
          id: 'test-user-id',
          roles: ['commercial'],
          sub: 'test-user-sub',
          username: 'test-user',
          email: 'test@example.com',
        };
        return true;
      }),
    };

    const mockRolesGuard = {
      canActivate: jest.fn(() => true),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      controllers: [ChatV2Controller],
    })
      .overrideProvider(QueryBus)
      .useValue(mockQueryBus)
      .overrideProvider(CommandBus)
      .useValue(mockCommandBus)
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    queryBus = moduleFixture.get<QueryBus>(QueryBus);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /v2/chats', () => {
    it('should return chats with cursor pagination', () => {
      return request(app.getHttpServer())
        .get('/v2/chats')
        .query({
          cursor:
            'eyJjcmVhdGVkQXQiOiIyMDI1LTA3LTI4VDEwOjMwOjAwLjAwMFoiLCJpZCI6ImNoYXQtMTIzIn0=',
          limit: 20,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('chats');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('hasMore');
          expect(res.body).toHaveProperty('nextCursor');
          expect(Array.isArray(res.body.chats)).toBe(true);
        });
    });

    it('should work without cursor parameter', () => {
      return request(app.getHttpServer())
        .get('/v2/chats')
        .query({ limit: 10 })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('chats');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('hasMore');
          expect(res.body).toHaveProperty('nextCursor');
        });
    });

    it('should accept filters parameter', () => {
      const filters = {
        status: ['ACTIVE', 'PENDING'],
        priority: ['HIGH'],
      };

      return request(app.getHttpServer())
        .get('/v2/chats')
        .query({
          filters: JSON.stringify(filters),
          limit: 5,
        })
        .expect(200);
    });

    it('should accept sort parameter', () => {
      const sort = {
        field: 'createdAt',
        direction: 'DESC',
      };

      return request(app.getHttpServer())
        .get('/v2/chats')
        .query({
          sort: JSON.stringify(sort),
          limit: 15,
        })
        .expect(200);
    });
  });

  describe('QueryBus Integration', () => {
    it('should call QueryBus with correct GetChatsWithFiltersQuery', async () => {
      const mockExecute = jest.fn().mockResolvedValue({
        chats: [],
        total: 0,
        hasMore: false,
        nextCursor: null,
      });

      (queryBus.execute as jest.Mock) = mockExecute;

      await request(app.getHttpServer()).get('/v2/chats').query({
        cursor: 'test-cursor',
        limit: 25,
      });

      expect(mockExecute).toHaveBeenCalledWith(
        expect.any(GetChatsWithFiltersQuery),
      );

      const calledQuery = mockExecute.mock.calls[0][0];
      expect(calledQuery).toBeInstanceOf(GetChatsWithFiltersQuery);
    });
  });
});
