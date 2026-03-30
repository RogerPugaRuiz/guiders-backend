import { Test, TestingModule } from '@nestjs/testing';
import { NotifyAgentRequestedOnAgentRequestedEventHandler } from '../notify-agent-requested-on-agent-requested.event-handler';
import { AgentRequestedEvent } from '../../../domain/events/agent-requested.event';
import { WebSocketGatewayBasic } from 'src/websocket/websocket.gateway';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

describe('NotifyAgentRequestedOnAgentRequestedEventHandler', () => {
  let handler: NotifyAgentRequestedOnAgentRequestedEventHandler;
  let mockGateway: jest.Mocked<WebSocketGatewayBasic>;

  beforeEach(async () => {
    mockGateway = {
      emitToRoom: jest.fn(),
      emitToRooms: jest.fn(),
    } as unknown as jest.Mocked<WebSocketGatewayBasic>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotifyAgentRequestedOnAgentRequestedEventHandler,
        {
          provide: 'WEBSOCKET_GATEWAY',
          useValue: mockGateway,
        },
      ],
    }).compile();

    handler = module.get<NotifyAgentRequestedOnAgentRequestedEventHandler>(
      NotifyAgentRequestedOnAgentRequestedEventHandler,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('debe emitir notificación de solicitud de agente a la sala de comerciales', () => {
      // Arrange
      const chatId = Uuid.random().value;
      const visitorId = Uuid.random().value;
      const requestedAt = new Date('2025-12-01T10:30:00Z');

      const event = new AgentRequestedEvent({
        request: {
          chatId,
          visitorId,
          previousPriority: 'NORMAL',
          newPriority: 'URGENT',
          source: 'quick_action',
          requestedAt,
        },
      });

      // Act
      handler.handle(event);

      // Assert
      expect(mockGateway.emitToRoom).toHaveBeenCalledWith(
        `chat:${chatId}:commercial`,
        'chat:agent-requested',
        expect.objectContaining({
          chatId,
          visitorId,
          previousPriority: 'NORMAL',
          priority: 'URGENT',
          source: 'quick_action',
          timestamp: '2025-12-01T10:30:00.000Z',
        }),
      );
    });

    it('debe emitir evento de cambio de prioridad cuando hubo cambio', () => {
      // Arrange
      const chatId = Uuid.random().value;
      const visitorId = Uuid.random().value;
      const requestedAt = new Date('2025-12-01T10:30:00Z');

      const event = new AgentRequestedEvent({
        request: {
          chatId,
          visitorId,
          previousPriority: 'NORMAL',
          newPriority: 'URGENT',
          source: 'quick_action',
          requestedAt,
        },
      });

      // Act
      handler.handle(event);

      // Assert - Debe emitir 2 eventos: agent-requested y priority-changed
      expect(mockGateway.emitToRoom).toHaveBeenCalledTimes(2);

      expect(mockGateway.emitToRoom).toHaveBeenCalledWith(
        `chat:${chatId}:commercial`,
        'chat:priority-changed',
        expect.objectContaining({
          chatId,
          previousPriority: 'NORMAL',
          newPriority: 'URGENT',
          reason: 'agent_requested',
        }),
      );
    });

    it('no debe emitir evento de cambio de prioridad cuando no hubo cambio', () => {
      // Arrange
      const chatId = Uuid.random().value;
      const visitorId = Uuid.random().value;
      const requestedAt = new Date('2025-12-01T10:30:00Z');

      const event = new AgentRequestedEvent({
        request: {
          chatId,
          visitorId,
          previousPriority: 'URGENT',
          newPriority: 'URGENT',
          source: 'button',
          requestedAt,
        },
      });

      // Act
      handler.handle(event);

      // Assert - Solo debe emitir el evento agent-requested
      expect(mockGateway.emitToRoom).toHaveBeenCalledTimes(1);
      expect(mockGateway.emitToRoom).toHaveBeenCalledWith(
        `chat:${chatId}:commercial`,
        'chat:agent-requested',
        expect.any(Object),
      );
    });

    it('debe manejar errores sin lanzar excepciones', () => {
      // Arrange
      mockGateway.emitToRoom.mockImplementation(() => {
        throw new Error('Error de red simulado');
      });

      const event = new AgentRequestedEvent({
        request: {
          chatId: Uuid.random().value,
          visitorId: Uuid.random().value,
          previousPriority: 'NORMAL',
          newPriority: 'URGENT',
          source: 'quick_action',
          requestedAt: new Date(),
        },
      });

      // Act & Assert - No debe lanzar error
      expect(() => handler.handle(event)).not.toThrow();
      expect(mockGateway.emitToRoom).toHaveBeenCalled();
    });

    it('debe usar el formato ISO correcto para el timestamp', () => {
      // Arrange
      const testDate = new Date('2025-12-01T12:30:45.123Z');
      const chatId = Uuid.random().value;

      const event = new AgentRequestedEvent({
        request: {
          chatId,
          visitorId: Uuid.random().value,
          previousPriority: 'NORMAL',
          newPriority: 'URGENT',
          source: 'quick_action',
          requestedAt: testDate,
        },
      });

      // Act
      handler.handle(event);

      // Assert
      expect(mockGateway.emitToRoom).toHaveBeenCalledWith(
        `chat:${chatId}:commercial`,
        'chat:agent-requested',
        expect.objectContaining({
          timestamp: '2025-12-01T12:30:45.123Z',
        }),
      );
    });

    it('debe notificar con diferentes sources', () => {
      // Arrange
      const sources = ['quick_action', 'button', 'manual', 'timeout'];

      for (const source of sources) {
        jest.clearAllMocks();

        const chatId = Uuid.random().value;
        const event = new AgentRequestedEvent({
          request: {
            chatId,
            visitorId: Uuid.random().value,
            previousPriority: 'NORMAL',
            newPriority: 'URGENT',
            source,
            requestedAt: new Date(),
          },
        });

        // Act
        handler.handle(event);

        // Assert
        expect(mockGateway.emitToRoom).toHaveBeenCalledWith(
          `chat:${chatId}:commercial`,
          'chat:agent-requested',
          expect.objectContaining({ source }),
        );
      }
    });

    it('debe notificar correctamente cuando cambia de HIGH a URGENT', () => {
      // Arrange
      const chatId = Uuid.random().value;
      const requestedAt = new Date('2025-12-01T14:00:00Z');

      const event = new AgentRequestedEvent({
        request: {
          chatId,
          visitorId: Uuid.random().value,
          previousPriority: 'HIGH',
          newPriority: 'URGENT',
          source: 'quick_action',
          requestedAt,
        },
      });

      // Act
      handler.handle(event);

      // Assert
      expect(mockGateway.emitToRoom).toHaveBeenCalledTimes(2);
      expect(mockGateway.emitToRoom).toHaveBeenCalledWith(
        `chat:${chatId}:commercial`,
        'chat:priority-changed',
        expect.objectContaining({
          previousPriority: 'HIGH',
          newPriority: 'URGENT',
        }),
      );
    });
  });
});
