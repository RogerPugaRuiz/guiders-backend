import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisher, EventBus } from '@nestjs/cqrs';
import { ChangeVisitorConnectionStatusCommandHandler } from '../change-visitor-connection-status.command-handler';
import { ChangeVisitorConnectionStatusCommand } from '../change-visitor-connection-status.command';
import {
  VISITOR_V2_REPOSITORY,
  VisitorV2Repository,
} from '../../../domain/visitor-v2.repository';
import { VisitorV2 } from '../../../domain/visitor-v2.aggregate';
import { VisitorId } from '../../../domain/value-objects/visitor-id';
import { TenantId } from '../../../domain/value-objects/tenant-id';
import { SiteId } from '../../../domain/value-objects/site-id';
import { VisitorFingerprint } from '../../../domain/value-objects/visitor-fingerprint';
import { VisitorLifecycleVO } from '../../../domain/value-objects/visitor-lifecycle';
import { ok } from '../../../../shared/domain/result';
import { ConnectionStatus } from '../../../domain/value-objects/visitor-connection';

describe('ChangeVisitorConnectionStatusCommandHandler', () => {
  let handler: ChangeVisitorConnectionStatusCommandHandler;
  let mockRepository: jest.Mocked<VisitorV2Repository>;
  let eventBus: EventBus;
  let publishedEvents: any[];

  beforeEach(async () => {
    publishedEvents = [];

    mockRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    } as any;

    // Mock del EventBus para capturar eventos publicados
    eventBus = {
      publish: jest.fn((event: any) => {
        publishedEvents.push(event);
        console.log('[TEST] Evento publicado:', event.constructor.name);
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChangeVisitorConnectionStatusCommandHandler,
        {
          provide: VISITOR_V2_REPOSITORY,
          useValue: mockRepository,
        },
        {
          provide: EventPublisher,
          useValue: {
            mergeObjectContext: (obj: any) => {
              // El proxy debe mantener referencia al objeto original para acceder a sus métodos
              // pero commit() debe acceder a los eventos acumulados
              obj.commit = () => {
                // Acceder a uncommittedEvents a través de getUncommittedEvents() si existe
                // o directamente del objeto
                const getEvents = obj.getUncommittedEvents?.bind(obj);
                const events = getEvents ? getEvents() : [];
                console.log(
                  '[TEST] commit() llamado, eventos pendientes:',
                  events.length,
                );
                events.forEach((event: any) => {
                  console.log(
                    '[TEST] Publicando evento desde commit:',
                    event.constructor.name,
                  );
                  eventBus.publish(event);
                });
                // Limpiar eventos después de publicar
                if (obj.uncommitAll) {
                  obj.uncommitAll();
                }
              };
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return
              return obj;
            },
          },
        },
        {
          provide: EventBus,
          useValue: eventBus,
        },
      ],
    }).compile();

    handler = module.get<ChangeVisitorConnectionStatusCommandHandler>(
      ChangeVisitorConnectionStatusCommandHandler,
    );
  });

  it('debe publicar VisitorConnectionChangedEvent al cambiar a AWAY', async () => {
    // Arrange
    const visitor = VisitorV2.create({
      id: VisitorId.random(),
      tenantId: TenantId.random(),
      siteId: SiteId.random(),
      fingerprint: new VisitorFingerprint('fp_test'),
      lifecycle: VisitorLifecycleVO.anon(),
    });

    // Poner online primero
    visitor.goOnline();

    mockRepository.findById.mockResolvedValue(ok(visitor));
    mockRepository.save.mockResolvedValue(ok(undefined as any));

    const command = new ChangeVisitorConnectionStatusCommand(
      visitor.getId().getValue(),
      'away',
    );

    // Act
    await handler.execute(command);

    // Assert
    console.log('[TEST] Total de eventos publicados:', publishedEvents.length);
    publishedEvents.forEach((event, index) => {
      console.log(`[TEST] Evento ${index}:`, event.constructor.name, event);
    });

    expect(publishedEvents.length).toBeGreaterThan(0);
    expect(mockRepository.save).toHaveBeenCalled();
  });

  it('debe llamar goAway() en el agregado', async () => {
    const visitor = VisitorV2.create({
      id: VisitorId.random(),
      tenantId: TenantId.random(),
      siteId: SiteId.random(),
      fingerprint: new VisitorFingerprint('fp_test'),
      lifecycle: VisitorLifecycleVO.anon(),
    });

    visitor.goOnline();
    const goAwaySpy = jest.spyOn(visitor, 'goAway');

    mockRepository.findById.mockResolvedValue(ok(visitor));
    mockRepository.save.mockResolvedValue(ok(undefined as any));

    const command = new ChangeVisitorConnectionStatusCommand(
      visitor.getId().getValue(),
      'away',
    );

    await handler.execute(command);

    expect(goAwaySpy).toHaveBeenCalled();
    expect(visitor.getConnectionStatus()).toBe(ConnectionStatus.AWAY);
  });
});
