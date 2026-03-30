import { Test, TestingModule } from '@nestjs/testing';
import { NotifyViewClosedOnChatViewClosedEventHandler } from '../notify-view-closed-on-chat-view-closed.event-handler';
import { ChatViewClosedEvent } from '../../../domain/events/chat-view-closed.event';
import { WebSocketGatewayBasic } from 'src/websocket/websocket.gateway';

describe('NotifyViewClosedOnChatViewClosedEventHandler', () => {
  let handler: NotifyViewClosedOnChatViewClosedEventHandler;
  let mockGateway: jest.Mocked<WebSocketGatewayBasic>;

  beforeEach(async () => {
    mockGateway = {
      emitToRoom: jest.fn(),
    } as unknown as jest.Mocked<WebSocketGatewayBasic>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotifyViewClosedOnChatViewClosedEventHandler,
        {
          provide: 'WEBSOCKET_GATEWAY',
          useValue: mockGateway,
        },
      ],
    }).compile();

    handler = module.get<NotifyViewClosedOnChatViewClosedEventHandler>(
      NotifyViewClosedOnChatViewClosedEventHandler,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('debe emitir notificacion de vista cerrada a la sala del chat', () => {
      // Arrange
      const event = new ChatViewClosedEvent({
        view: {
          chatId: 'chat-123',
          userId: 'visitor-456',
          userRole: 'visitor',
          closedAt: new Date('2025-10-03T10:00:00Z'),
        },
      });

      // Act
      handler.handle(event);

      // Assert
      expect(mockGateway.emitToRoom).toHaveBeenCalledTimes(1);
      expect(mockGateway.emitToRoom).toHaveBeenCalledWith(
        'chat:chat-123',
        'chat:view-closed',
        expect.objectContaining({
          chatId: 'chat-123',
          userId: 'visitor-456',
          userRole: 'visitor',
        }),
      );
    });

    it('debe emitir a sala de comerciales cuando es un comercial', () => {
      // Arrange
      const event = new ChatViewClosedEvent({
        view: {
          chatId: 'chat-123',
          userId: 'commercial-789',
          userRole: 'commercial',
          closedAt: new Date('2025-10-03T10:00:00Z'),
        },
      });

      // Act
      handler.handle(event);

      // Assert
      expect(mockGateway.emitToRoom).toHaveBeenCalledTimes(2);

      // Primera llamada: sala general del chat
      expect(mockGateway.emitToRoom).toHaveBeenNthCalledWith(
        1,
        'chat:chat-123',
        'chat:view-closed',
        expect.objectContaining({
          chatId: 'chat-123',
          userId: 'commercial-789',
          userRole: 'commercial',
        }),
      );

      // Segunda llamada: sala de comerciales
      expect(mockGateway.emitToRoom).toHaveBeenNthCalledWith(
        2,
        'chat:chat-123:commercial',
        'chat:view-closed',
        expect.objectContaining({
          chatId: 'chat-123',
          userId: 'commercial-789',
          userRole: 'commercial',
        }),
      );
    });

    it('debe manejar errores sin lanzar excepciones', () => {
      // Arrange
      mockGateway.emitToRoom.mockImplementation(() => {
        throw new Error('Error de red simulado');
      });

      const event = new ChatViewClosedEvent({
        view: {
          chatId: 'chat-123',
          userId: 'visitor-456',
          userRole: 'visitor',
          closedAt: new Date(),
        },
      });

      // Act & Assert - No debe lanzar error
      expect(() => handler.handle(event)).not.toThrow();
      expect(mockGateway.emitToRoom).toHaveBeenCalled();
    });
  });
});
