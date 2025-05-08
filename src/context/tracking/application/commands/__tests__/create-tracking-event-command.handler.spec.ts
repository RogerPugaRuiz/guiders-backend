/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisher } from '@nestjs/cqrs';
import { CreateTrackingEventCommandHandler } from '../create-tracking-event-command.handler';
import { CreateTrackingEventCommand } from '../create-tracking-event.command';
import {
  ITrackingEventRepository,
  TRACKING_EVENT_REPOSITORY,
} from '../../../domain/tracking-event.repository';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import { okVoid } from 'src/context/shared/domain/result';

// Pruebas unitarias para CreateTrackingEventCommandHandler
// Se mockean el repositorio y el EventPublisher siguiendo buenas prácticas DDD + CQRS

describe('CreateTrackingEventCommandHandler', () => {
  let handler: CreateTrackingEventCommandHandler;
  let repository: jest.Mocked<ITrackingEventRepository>;
  let eventPublisher: jest.Mocked<EventPublisher>;

  beforeEach(async () => {
    // Configuración del mock para el repositorio
    repository = {
      save: jest.fn().mockResolvedValue(okVoid()),
      find: jest.fn(),
      match: jest.fn(),
    } as jest.Mocked<ITrackingEventRepository>;

    // Configuración del mock para el EventPublisher
    eventPublisher = {
      mergeObjectContext: jest.fn().mockReturnValue({
        commit: jest.fn(),
      }),
    } as any as jest.Mocked<EventPublisher>;

    // Configuración del módulo de prueba con las dependencias correctamente definidas
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateTrackingEventCommandHandler,
        {
          provide: TRACKING_EVENT_REPOSITORY,
          useValue: repository,
        },
        {
          provide: EventPublisher,
          useValue: eventPublisher,
        },
      ],
    }).compile();

    handler = module.get<CreateTrackingEventCommandHandler>(
      CreateTrackingEventCommandHandler,
    );
  });

  it('debe crear y persistir un TrackingEvent correctamente', async () => {
    // Arrange: datos de entrada usando Uuid
    const id = Uuid.random().value;
    const visitorId = Uuid.random().value;
    const eventType = 'click';
    const metadata = { foo: 'bar' };
    const occurredAt = new Date();
    const command = new CreateTrackingEventCommand({
      id,
      visitorId,
      eventType,
      metadata,
      occurredAt,
    });

    // Act
    await handler.execute(command);

    // Assert: verifica que el repositorio y el publisher fueron llamados correctamente
    expect(repository.save).toHaveBeenCalled();
    expect(eventPublisher.mergeObjectContext).toHaveBeenCalled();
  });
});
