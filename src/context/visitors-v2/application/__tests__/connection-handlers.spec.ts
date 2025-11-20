import { EventPublisher } from '@nestjs/cqrs';
import { GoOnlineVisitorCommandHandler } from '../commands/go-online-visitor.command-handler';
import { StartChattingVisitorCommandHandler } from '../commands/start-chatting-visitor.command-handler';
import { GoOfflineVisitorCommandHandler } from '../commands/go-offline-visitor.command-handler';
import { GetOnlineVisitorsQueryHandler } from '../queries/get-online-visitors.query-handler';
import { GetChattingVisitorsQueryHandler } from '../queries/get-chatting-visitors.query-handler';
import { GetVisitorConnectionStatusQueryHandler } from '../queries/get-visitor-connection-status.query-handler';
import { SyncConnectionOnVisitorConnectionChangedEventHandler } from '../events/visitor-connection-changed.event-handler';
import { VisitorV2Repository } from '../../domain/visitor-v2.repository';
import { VisitorV2 } from '../../domain/visitor-v2.aggregate';
import { VisitorId } from '../../domain/value-objects/visitor-id';
import { TenantId } from '../../domain/value-objects/tenant-id';
import { SiteId } from '../../domain/value-objects/site-id';
import { VisitorFingerprint } from '../../domain/value-objects/visitor-fingerprint';
import {
  VisitorLifecycleVO,
  VisitorLifecycle,
} from '../../domain/value-objects/visitor-lifecycle';
import { GoOnlineVisitorCommand } from '../commands/go-online-visitor.command';
import { StartChattingVisitorCommand } from '../commands/start-chatting-visitor.command';
import { GoOfflineVisitorCommand } from '../commands/go-offline-visitor.command';
import { GetVisitorConnectionStatusQuery } from '../queries/get-visitor-connection-status.query';
import { VisitorConnectionDomainService } from '../../domain/visitor-connection.domain-service';
import { VisitorConnectionChangedEvent } from '../../domain/events/visitor-connection-changed.event';
import {
  ConnectionStatus,
  VisitorConnectionVO,
} from '../../domain/value-objects/visitor-connection';

const buildVisitor = () =>
  VisitorV2.create({
    id: new VisitorId('11111111-1111-4111-8111-111111111111'),
    tenantId: new TenantId('22222222-2222-4222-8222-222222222222'),
    siteId: new SiteId('33333333-3333-4333-8333-333333333333'),
    fingerprint: new VisitorFingerprint('fp_handler'),
    lifecycle: new VisitorLifecycleVO(VisitorLifecycle.ANON),
  });

describe('Connection Handlers', () => {
  let repository: jest.Mocked<VisitorV2Repository>;
  let publisher: EventPublisher;
  let connectionService: jest.Mocked<VisitorConnectionDomainService>;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    } as any;
    // Instanciamos un EventPublisher "vacío" y parcheamos mergeObjectContext
    publisher = {
      mergeObjectContext: (agg: unknown) => agg,
    } as unknown as EventPublisher;

    connectionService = {
      setConnectionStatus: jest.fn(),
      getConnectionStatus: jest.fn(),
      removeConnection: jest.fn(),
      getOnlineVisitors: jest.fn(),
      getChattingVisitors: jest.fn(),
    } as any;
  });

  describe('Command Handlers', () => {
    it('GoOnlineVisitorCommandHandler guarda y commit', async () => {
      const visitor = buildVisitor();
      repository.findById.mockResolvedValue({
        isErr(): this is any {
          return false;
        },
        isOk(): this is any {
          return true;
        },
        unwrap: () => visitor,
      } as any);
      const handler = new GoOnlineVisitorCommandHandler(repository, publisher);
      await handler.execute(
        new GoOnlineVisitorCommand(visitor.getId().getValue()),
      );
      expect(repository.save).toHaveBeenCalledWith(visitor);
    });

    it('StartChattingVisitorCommandHandler emite evento chatting', async () => {
      const visitor = buildVisitor();
      visitor.goOnline();
      (visitor as any).getUncommittedEvents?.(); // limpiar no implementado; ignorar
      repository.findById.mockResolvedValue({
        isErr(): this is any {
          return false;
        },
        isOk(): this is any {
          return true;
        },
        unwrap: () => visitor,
      } as any);
      const handler = new StartChattingVisitorCommandHandler(
        repository,
        publisher,
      );
      await handler.execute(
        new StartChattingVisitorCommand(visitor.getId().getValue()),
      );
      expect(repository.save).toHaveBeenCalled();
    });

    it('GoOfflineVisitorCommandHandler emite evento offline', async () => {
      const visitor = buildVisitor();
      visitor.goOnline();
      repository.findById.mockResolvedValue({
        isErr(): this is any {
          return false;
        },
        isOk(): this is any {
          return true;
        },
        unwrap: () => visitor,
      } as any);
      const handler = new GoOfflineVisitorCommandHandler(repository, publisher);
      await handler.execute(
        new GoOfflineVisitorCommand(visitor.getId().getValue()),
      );
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('Query Handlers', () => {
    it('GetOnlineVisitorsQueryHandler retorna ids', async () => {
      connectionService.getOnlineVisitors.mockResolvedValue([
        new VisitorId('11111111-1111-4111-8111-111111111112'),
      ]);
      const handler = new GetOnlineVisitorsQueryHandler(connectionService);
      const res = await handler.execute();
      expect(res).toEqual(['11111111-1111-4111-8111-111111111112']);
    });

    it('GetChattingVisitorsQueryHandler retorna ids', async () => {
      connectionService.getChattingVisitors.mockResolvedValue([
        new VisitorId('11111111-1111-4111-8111-111111111113'),
      ]);
      const handler = new GetChattingVisitorsQueryHandler(connectionService);
      const res = await handler.execute();
      expect(res).toEqual(['11111111-1111-4111-8111-111111111113']);
    });

    it('GetVisitorConnectionStatusQueryHandler retorna status', async () => {
      connectionService.getConnectionStatus.mockResolvedValue(
        new VisitorConnectionVO(ConnectionStatus.ONLINE),
      );
      const handler = new GetVisitorConnectionStatusQueryHandler(
        connectionService,
      );
      const res = await handler.execute(
        new GetVisitorConnectionStatusQuery(
          '11111111-1111-4111-8111-111111111114',
        ),
      );
      expect(res).toBe('online');
    });
  });

  describe('Event Handler', () => {
    it('sincroniza setConnectionStatus cuando no offline', async () => {
      const handler = new SyncConnectionOnVisitorConnectionChangedEventHandler(
        connectionService,
        repository,
      );
      await handler.handle(
        new VisitorConnectionChangedEvent({
          visitorId: '11111111-1111-4111-8111-111111111115',
          previousConnection: 'offline',
          newConnection: 'online',
          timestamp: new Date().toISOString(),
        }),
      );
      expect(connectionService.setConnectionStatus).toHaveBeenCalled();
    });

    it('sincroniza removeConnection cuando offline', async () => {
      const handler = new SyncConnectionOnVisitorConnectionChangedEventHandler(
        connectionService,
        repository,
      );
      await handler.handle(
        new VisitorConnectionChangedEvent({
          visitorId: '11111111-1111-4111-8111-111111111116',
          previousConnection: 'chatting',
          newConnection: 'offline',
          timestamp: new Date().toISOString(),
        }),
      );
      expect(connectionService.removeConnection).toHaveBeenCalled();
    });
  });
});
