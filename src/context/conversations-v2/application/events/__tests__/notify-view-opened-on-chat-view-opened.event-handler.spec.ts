import { Test, TestingModule } from '@nestjs/testing';
import { NotifyViewOpenedOnChatViewOpenedEventHandler } from '../notify-view-opened-on-chat-view-opened.event-handler';
import { ChatViewOpenedEvent } from '../../../domain/events/chat-view-opened.event';
import { WebSocketGatewayBasic } from 'src/websocket/websocket.gateway';

describe('NotifyViewOpenedOnChatViewOpenedEventHandler', () => {
  let handler: NotifyViewOpenedOnChatViewOpenedEventHandler;
  let mockGateway: jest.Mocked<WebSocketGatewayBasic>;

  beforeEach(async () => {
    mockGateway = {
      emitToRoom: jest.fn(),
    } as unknown as jest.Mocked<WebSocketGatewayBasic>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotifyViewOpenedOnChatViewOpenedEventHandler,
        {
          provide: 'WEBSOCKET_GATEWAY',
          useValue: mockGateway,
        },
      ],
    }).compile();

    handler = module.get<NotifyViewOpenedOnChatViewOpenedEventHandler>(
      NotifyViewOpenedOnChatViewOpenedEventHandler,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('debe emitir notificacion de vista abierta a la sala del chat', () => {
      // Arrange
      const event = new ChatViewOpenedEvent({
        view: {
          chatId: 'chat-123',
          userId: 'visitor-456',
          userRole: 'visitor',
          openedAt: new Date('2025-10-03T10:00:00Z'),
        },
      });

      // Act
      handler.handle(event);

      // Assert
      expect(mockGateway.emitToRoom).toHaveBeenCalledTimes(1);
      expect(mockGateway.emitToRoom).toHaveBeenCalledWith(
        'chat:chat-123',
        'chat:view-opened',
        expect.objectContaining({
          chatId: 'chat-123',
          userId: 'visitor-456',
          userRole: 'visitor',
        }),
      );
    });

    it('debe emitir a sala de comerciales cuando es un comercial', () => {
      // Arrange
      const event = new ChatViewOpenedEvent({
        view: {
          chatId: 'chat-123',
          userId: 'commercial-789',
          userRole: 'commercial',
          openedAt: new Date('2025-10-03T10:00:00Z'),
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
        'chat:view-opened',
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
        'chat:view-opened',
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

      const event = new ChatViewOpenedEvent({
        view: {
          chatId: 'chat-123',
          userId: 'visitor-456',
          userRole: 'visitor',
          openedAt: new Date(),
        },
      });

      // Act & Assert - No debe lanzar error
      expect(() => handler.handle(event)).not.toThrow();
      expect(mockGateway.emitToRoom).toHaveBeenCalled();
    });
  });
});
