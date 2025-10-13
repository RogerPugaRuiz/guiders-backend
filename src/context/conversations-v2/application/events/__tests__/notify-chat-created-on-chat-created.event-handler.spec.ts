import { Test, TestingModule } from '@nestjs/testing';
import { NotifyChatCreatedOnChatCreatedEventHandler } from '../notify-chat-created-on-chat-created.event-handler';
import { ChatCreatedEvent } from '../../../domain/events/chat-created.event';
import { WebSocketGatewayBasic } from 'src/websocket/websocket.gateway';

describe('NotifyChatCreatedOnChatCreatedEventHandler', () => {
  let handler: NotifyChatCreatedOnChatCreatedEventHandler;
  let mockGateway: jest.Mocked<WebSocketGatewayBasic>;

  beforeEach(async () => {
    // Mock del WebSocket Gateway
    mockGateway = {
      emitToRoom: jest.fn(),
      emitToRooms: jest.fn(),
    } as unknown as jest.Mocked<WebSocketGatewayBasic>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotifyChatCreatedOnChatCreatedEventHandler,
        {
          provide: 'WEBSOCKET_GATEWAY',
          useValue: mockGateway,
        },
      ],
    }).compile();

    handler = module.get<NotifyChatCreatedOnChatCreatedEventHandler>(
      NotifyChatCreatedOnChatCreatedEventHandler,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('debe emitir notificación de chat creado a la sala del visitante', () => {
      // Arrange
      const event = new ChatCreatedEvent({
        chat: {
          chatId: 'chat-123',
          visitorId: 'visitor-456',
          companyId: 'company-789',
          status: 'PENDING',
          priority: 'NORMAL',
          visitorInfo: {
            name: 'Juan Pérez',
            email: 'juan@example.com',
          },
          createdAt: new Date('2025-10-13T10:00:00Z'),
        },
      });

      // Act
      handler.handle(event);

      // Assert
      expect(mockGateway.emitToRoom).toHaveBeenCalledTimes(1);
      expect(mockGateway.emitToRoom).toHaveBeenCalledWith(
        'visitor:visitor-456',
        'chat:created',
        expect.objectContaining({
          chatId: 'chat-123',
          visitorId: 'visitor-456',
          status: 'PENDING',
          priority: 'NORMAL',
          visitorInfo: {
            name: 'Juan Pérez',
            email: 'juan@example.com',
          },
          createdAt: '2025-10-13T10:00:00.000Z',
          message: 'Un comercial ha iniciado una conversación contigo',
        }),
      );
    });

    it('debe emitir notificación con metadata cuando está presente', () => {
      // Arrange
      const event = new ChatCreatedEvent({
        chat: {
          chatId: 'chat-789',
          visitorId: 'visitor-123',
          companyId: 'company-456',
          status: 'ASSIGNED',
          priority: 'HIGH',
          visitorInfo: {
            name: 'María García',
            email: 'maria@example.com',
            phone: '+34 600 123 456',
          },
          metadata: {
            department: 'ventas',
            product: 'premium',
            source: 'web',
            tags: ['vip', 'urgente'],
          },
          createdAt: new Date('2025-10-13T11:30:00Z'),
        },
      });

      // Act
      handler.handle(event);

      // Assert
      expect(mockGateway.emitToRoom).toHaveBeenCalledWith(
        'visitor:visitor-123',
        'chat:created',
        expect.objectContaining({
          chatId: 'chat-789',
          visitorId: 'visitor-123',
          status: 'ASSIGNED',
          priority: 'HIGH',
          metadata: {
            department: 'ventas',
            product: 'premium',
            source: 'web',
            tags: ['vip', 'urgente'],
          },
        }),
      );
    });

    it('debe emitir notificación con información completa del visitante', () => {
      // Arrange
      const event = new ChatCreatedEvent({
        chat: {
          chatId: 'chat-complete',
          visitorId: 'visitor-complete',
          companyId: 'company-test',
          status: 'PENDING',
          priority: 'URGENT',
          visitorInfo: {
            name: 'Pedro López',
            email: 'pedro@example.com',
            phone: '+34 600 999 888',
            company: 'Tech Solutions S.L.',
            ipAddress: '192.168.1.100',
            location: {
              country: 'España',
              city: 'Madrid',
            },
            referrer: 'https://google.com',
            userAgent: 'Mozilla/5.0',
          },
          createdAt: new Date('2025-10-13T14:00:00Z'),
        },
      });

      // Act
      handler.handle(event);

      // Assert
      expect(mockGateway.emitToRoom).toHaveBeenCalledWith(
        'visitor:visitor-complete',
        'chat:created',
        expect.objectContaining({
          visitorInfo: expect.objectContaining({
            name: 'Pedro López',
            email: 'pedro@example.com',
            phone: '+34 600 999 888',
            company: 'Tech Solutions S.L.',
            ipAddress: '192.168.1.100',
            location: {
              country: 'España',
              city: 'Madrid',
            },
          }),
        }),
      );
    });

    it('debe manejar errores sin lanzar excepciones', () => {
      // Arrange
      mockGateway.emitToRoom.mockImplementation(() => {
        throw new Error('Error de red simulado');
      });

      const event = new ChatCreatedEvent({
        chat: {
          chatId: 'chat-error',
          visitorId: 'visitor-error',
          companyId: 'company-error',
          status: 'PENDING',
          priority: 'NORMAL',
          visitorInfo: {},
          createdAt: new Date(),
        },
      });

      // Act & Assert - No debe lanzar error
      expect(() => handler.handle(event)).not.toThrow();
      expect(mockGateway.emitToRoom).toHaveBeenCalled();
    });

    it('debe usar el formato ISO correcto para la fecha de creación', () => {
      // Arrange
      const testDate = new Date('2025-10-13T12:30:45.123Z');
      const event = new ChatCreatedEvent({
        chat: {
          chatId: 'chat-date-test',
          visitorId: 'visitor-date',
          companyId: 'company-date',
          status: 'PENDING',
          priority: 'NORMAL',
          visitorInfo: {},
          createdAt: testDate,
        },
      });

      // Act
      handler.handle(event);

      // Assert
      expect(mockGateway.emitToRoom).toHaveBeenCalledWith(
        'visitor:visitor-date',
        'chat:created',
        expect.objectContaining({
          createdAt: '2025-10-13T12:30:45.123Z',
        }),
      );
    });

    it('debe notificar correctamente cuando no hay metadata', () => {
      // Arrange
      const event = new ChatCreatedEvent({
        chat: {
          chatId: 'chat-no-metadata',
          visitorId: 'visitor-simple',
          companyId: 'company-simple',
          status: 'PENDING',
          priority: 'NORMAL',
          visitorInfo: {
            name: 'Usuario Simple',
          },
          metadata: undefined,
          createdAt: new Date('2025-10-13T10:00:00Z'),
        },
      });

      // Act
      handler.handle(event);

      // Assert
      expect(mockGateway.emitToRoom).toHaveBeenCalledWith(
        'visitor:visitor-simple',
        'chat:created',
        expect.objectContaining({
          chatId: 'chat-no-metadata',
          visitorId: 'visitor-simple',
          metadata: undefined,
        }),
      );
    });
  });
});
