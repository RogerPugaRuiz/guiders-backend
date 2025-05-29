import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { DetectCommercialDisconnectedEventHandler } from '../detect-commercial-disconnected.event-handler';
import { DisconnectedEvent } from '../../../domain/events/disconnected.event';
import { CommercialDisconnectedEvent } from '../../../domain/events/commercial-disconnected.event';
import { ConnectionRole } from '../../../domain/value-objects/connection-role';

describe('DetectCommercialDisconnectedEventHandler', () => {
  let handler: DetectCommercialDisconnectedEventHandler;
  let mockEventBus: Partial<EventBus>;

  beforeEach(async () => {
    mockEventBus = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DetectCommercialDisconnectedEventHandler,
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    handler = module.get<DetectCommercialDisconnectedEventHandler>(
      DetectCommercialDisconnectedEventHandler,
    );
  });

  it('debe estar definido', () => {
    expect(handler).toBeDefined();
  });

  describe('handle', () => {
    it('debe publicar evento cuando un comercial se desconecta', () => {
      // Arrange
      const userId = 'commercial-id';
      const socketId = 'socket-123';
      const event = new DisconnectedEvent({
        userId,
        roles: [ConnectionRole.COMMERCIAL, ConnectionRole.VISITOR],
        socketId,
      });

      // Act
      handler.handle(event);

      // Assert
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);

      // Verificamos que el evento publicado contiene los datos esperados
      const publishMock = mockEventBus.publish as jest.Mock;
      const publishedEvent = publishMock.mock.calls[0][0] as CommercialDisconnectedEvent;
      expect(publishedEvent).toBeInstanceOf(CommercialDisconnectedEvent);
      expect(publishedEvent.connection.userId).toBe(userId);
    });

    it('no debe publicar ningún evento si el usuario no es comercial', () => {
      // Arrange
      const event = new DisconnectedEvent({
        userId: 'visitor-id',
        roles: [ConnectionRole.VISITOR],
        socketId: 'socket-123',
      });

      // Act
      handler.handle(event);

      // Assert
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });
});
