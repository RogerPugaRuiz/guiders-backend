import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { CqrsModule, CommandBus, QueryBus } from '@nestjs/cqrs';
import { GoOnlineVisitorCommand } from '../src/context/visitors-v2/application/commands/go-online-visitor.command';
import { StartChattingVisitorCommand } from '../src/context/visitors-v2/application/commands/start-chatting-visitor.command';
import { GoOfflineVisitorCommand } from '../src/context/visitors-v2/application/commands/go-offline-visitor.command';
import { GetOnlineVisitorsQuery } from '../src/context/visitors-v2/application/queries/get-online-visitors.query';
import { GetChattingVisitorsQuery } from '../src/context/visitors-v2/application/queries/get-chatting-visitors.query';
import { GetVisitorConnectionStatusQuery } from '../src/context/visitors-v2/application/queries/get-visitor-connection-status.query';
import { VisitorsV2Module } from '../src/context/visitors-v2/visitors-v2.module';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { VisitorV2 } from '../src/context/visitors-v2/domain/visitor-v2.aggregate';
import { VisitorV2MongoRepositoryImpl } from '../src/context/visitors-v2/infrastructure/persistence/impl/visitor-v2-mongo.repository.impl';
import { VISITOR_V2_REPOSITORY } from '../src/context/visitors-v2/domain/visitor-v2.repository';
import { VisitorId } from '../src/context/visitors-v2/domain/value-objects/visitor-id';
import { TenantId } from '../src/context/visitors-v2/domain/value-objects/tenant-id';
import { SiteId } from '../src/context/visitors-v2/domain/value-objects/site-id';
import { VisitorFingerprint } from '../src/context/visitors-v2/domain/value-objects/visitor-fingerprint';
import {
  VisitorLifecycleVO,
  VisitorLifecycle,
} from '../src/context/visitors-v2/domain/value-objects/visitor-lifecycle';

// E2E interno usando buses CQRS directamente para validar flujo de conexión
// Requiere Redis activo (docker-compose) y Mongo in-memory

describe('Visitor Connection V2 E2E', () => {
  let app: INestApplication;
  let commandBus: CommandBus;
  let queryBus: QueryBus;
  let mongo: MongoMemoryServer;
  let repository: VisitorV2MongoRepositoryImpl;
  const visitorId = '10000000-0000-4000-8000-000000000001';

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri();

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        CqrsModule,
        MongooseModule.forRoot(uri, { dbName: 'test-db' }),
        VisitorsV2Module,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    commandBus = moduleRef.get(CommandBus);
    queryBus = moduleRef.get(QueryBus);
    repository = moduleRef.get(VISITOR_V2_REPOSITORY);

    // Seed visitor directamente (simulando identify ya ejecutado)
    const seed = VisitorV2.create({
      id: new VisitorId(visitorId),
      tenantId: new TenantId('20000000-0000-4000-8000-000000000001'),
      siteId: new SiteId('30000000-0000-4000-8000-000000000001'),
      fingerprint: new VisitorFingerprint('fp_conn_e2e'),
      lifecycle: new VisitorLifecycleVO(VisitorLifecycle.ANON),
    });
    // Guardar por repositorio real
  await repository.save(seed as any);
  });

  afterAll(async () => {
    await app.close();
    if (mongo) await mongo.stop();
  });

  it('flujo online -> chatting -> offline', async () => {
    await commandBus.execute(new GoOnlineVisitorCommand(visitorId));
    const statusOnline = await queryBus.execute(
      new GetVisitorConnectionStatusQuery(visitorId),
    );
    expect(statusOnline).toBe('online');
    const onlineList = await queryBus.execute(new GetOnlineVisitorsQuery());
    expect(onlineList).toContain(visitorId);

    await commandBus.execute(new StartChattingVisitorCommand(visitorId));
    const statusChatting = await queryBus.execute(
      new GetVisitorConnectionStatusQuery(visitorId),
    );
    expect(statusChatting).toBe('chatting');
    const chattingList = await queryBus.execute(
      new GetChattingVisitorsQuery(),
    );
    expect(chattingList).toContain(visitorId);

    await commandBus.execute(new GoOfflineVisitorCommand(visitorId));
    const statusOffline = await queryBus.execute(
      new GetVisitorConnectionStatusQuery(visitorId),
    );
    expect(statusOffline).toBe('offline');
    const onlineListAfter = await queryBus.execute(
      new GetOnlineVisitorsQuery(),
    );
    expect(onlineListAfter).not.toContain(visitorId);
  });
});
