import { Test, TestingModule } from '@nestjs/testing';
import { NotifyPresenceChangedOnPresenceChangedEventHandler } from '../notify-presence-changed-on-presence-changed.event-handler';
import { PresenceChangedEvent } from '../../../domain/events/presence-changed.event';
import { WebSocketGatewayBasic } from 'src/websocket/websocket.gateway';
import {
  IChatRepository,
  CHAT_V2_REPOSITORY,
} from 'src/context/conversations-v2/domain/chat.repository';
import { ok } from 'src/context/shared/domain/result';
import { Chat } from 'src/context/conversations-v2/domain/entities/chat.aggregate';
import { ChatStatusEnum } from 'src/context/conversations-v2/domain/value-objects/chat-status';

describe('NotifyPresenceChangedOnPresenceChangedEventHandler', () => {
  let handler: NotifyPresenceChangedOnPresenceChangedEventHandler;
  let mockWebSocketGateway: jest.Mocked<WebSocketGatewayBasic>;
  let mockChatRepository: jest.Mocked<IChatRepository>;

  beforeEach(async () => {
    // Mock del WebSocketGateway
    mockWebSocketGateway = {
      emitToRoom: jest.fn(),
    } as any;

    // Mock del ChatRepository
    mockChatRepository = {
      findByVisitorId: jest.fn(),
      findByCommercialId: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotifyPresenceChangedOnPresenceChangedEventHandler,
        {
          provide: 'WEBSOCKET_GATEWAY',
          useValue: mockWebSocketGateway,
        },
        {
          provide: CHAT_V2_REPOSITORY,
          useValue: mockChatRepository,
        },
      ],
    }).compile();

    handler = module.get<NotifyPresenceChangedOnPresenceChangedEventHandler>(
      NotifyPresenceChangedOnPresenceChangedEventHandler,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle - Visitante cambia presencia', () => {
    it('debe emitir eventos granulares a salas de chat y globales a comerciales', async () => {
      // Arrange
      const visitorId = '550e8400-e29b-41d4-a716-446655440000';
      const commercial1Id = '550e8400-e29b-41d4-a716-446655440001';
      const commercial2Id = '550e8400-e29b-41d4-a716-446655440002';

      const event = new PresenceChangedEvent(
        visitorId,
        'visitor',
        'offline',
        'online',
        'tenant-123',
      );

      // Mock de chats activos con 2 comerciales diferentes
      const mockChat1 = {
        toPrimitives: () => ({
          id: 'chat-1',
          visitorId,
          assignedCommercialId: commercial1Id,
          status: ChatStatusEnum.ACTIVE,
        }),
      } as unknown as Chat;

      const mockChat2 = {
        toPrimitives: () => ({
          id: 'chat-2',
          visitorId,
          assignedCommercialId: commercial2Id,
          status: ChatStatusEnum.ASSIGNED,
        }),
      } as unknown as Chat;

      mockChatRepository.findByVisitorId.mockResolvedValue(
        ok([mockChat1, mockChat2]),
      );

      // Act
      await handler.handle(event);

      // Assert
      // Emisión dual: 1 visitante + 2 granulares (chat:id) + 2 globales (commercial:id)
      expect(mockWebSocketGateway.emitToRoom).toHaveBeenCalledTimes(5);

      // Verifica emisión a sala del visitante
      expect(mockWebSocketGateway.emitToRoom).toHaveBeenCalledWith(
        `visitor:${visitorId}`,
        'presence:changed',
        expect.objectContaining({
          userId: visitorId,
          userType: 'visitor',
          status: 'online',
          previousStatus: 'offline',
        }),
      );

      // Verifica emisión GRANULAR a sala de chat 1
      expect(mockWebSocketGateway.emitToRoom).toHaveBeenCalledWith(
        'chat:chat-1',
        'presence:changed',
        expect.objectContaining({
          userId: visitorId,
          userType: 'visitor',
          status: 'online',
          chatId: 'chat-1',
        }),
      );

      // Verifica emisión GRANULAR a sala de chat 2
      expect(mockWebSocketGateway.emitToRoom).toHaveBeenCalledWith(
        'chat:chat-2',
        'presence:changed',
        expect.objectContaining({
          userId: visitorId,
          userType: 'visitor',
          status: 'online',
          chatId: 'chat-2',
        }),
      );

      // Verifica emisión GLOBAL a comercial 1 con affectedChatIds
      expect(mockWebSocketGateway.emitToRoom).toHaveBeenCalledWith(
        `commercial:${commercial1Id}`,
        'presence:changed',
        expect.objectContaining({
          userId: visitorId,
          userType: 'visitor',
          status: 'online',
          affectedChatIds: ['chat-1'],
        }),
      );

      // Verifica emisión GLOBAL a comercial 2 con affectedChatIds
      expect(mockWebSocketGateway.emitToRoom).toHaveBeenCalledWith(
        `commercial:${commercial2Id}`,
        'presence:changed',
        expect.objectContaining({
          userId: visitorId,
          userType: 'visitor',
          status: 'online',
          affectedChatIds: ['chat-2'],
        }),
      );

      // NO debe emitir a sala de tenant
      expect(mockWebSocketGateway.emitToRoom).not.toHaveBeenCalledWith(
        expect.stringContaining('tenant:'),
        expect.anything(),
        expect.anything(),
      );
    });

    it('debe notificar solo al visitante si no tiene chats activos ni recientes', async () => {
      // Arrange
      const visitorId = '550e8400-e29b-41d4-a716-446655440000';
      const tenantId = 'tenant-123';
      const event = new PresenceChangedEvent(
        visitorId,
        'visitor',
        'offline',
        'online',
        tenantId,
      );

      // Primera llamada: chats activos = vacío
      // Segunda llamada: chats cerrados/completados = vacío
      mockChatRepository.findByVisitorId
        .mockResolvedValueOnce(ok([])) // Chats activos
        .mockResolvedValueOnce(ok([])); // Chats cerrados

      // Act
      await handler.handle(event);

      // Assert
      // Solo debe emitir 1 vez: al propio visitante
      expect(mockWebSocketGateway.emitToRoom).toHaveBeenCalledTimes(1);

      // Verifica emisión al visitante
      expect(mockWebSocketGateway.emitToRoom).toHaveBeenCalledWith(
        `visitor:${visitorId}`,
        'presence:changed',
        expect.any(Object),
      );
    });

    it('debe emitir eventos granulares y globales para chats cerrados recientemente', async () => {
      // Arrange
      const visitorId = '550e8400-e29b-41d4-a716-446655440000';
      const commercialId = 'commercial-456';
      const tenantId = 'tenant-123';
      const event = new PresenceChangedEvent(
        visitorId,
        'visitor',
        'offline',
        'online',
        tenantId,
      );

      // Mock de chat cerrado hace 1 hora (debe notificar)
      const recentClosedChat = {
        toPrimitives: () => ({
          id: 'chat-1',
          visitorId,
          assignedCommercialId: commercialId,
          status: ChatStatusEnum.CLOSED,
          closedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // Hace 1 hora
        }),
      } as unknown as Chat;

      // Primera llamada: chats activos = vacío
      // Segunda llamada: chats cerrados = 1 chat reciente
      mockChatRepository.findByVisitorId
        .mockResolvedValueOnce(ok([])) // Chats activos
        .mockResolvedValueOnce(ok([recentClosedChat])); // Chats cerrados

      // Act
      await handler.handle(event);

      // Assert
      // Emisión dual: 1 visitante + 1 granular (chat:id) + 1 global (commercial:id)
      expect(mockWebSocketGateway.emitToRoom).toHaveBeenCalledTimes(3);

      // Verifica emisión al visitante
      expect(mockWebSocketGateway.emitToRoom).toHaveBeenCalledWith(
        `visitor:${visitorId}`,
        'presence:changed',
        expect.any(Object),
      );

      // Verifica emisión GRANULAR a sala del chat
      expect(mockWebSocketGateway.emitToRoom).toHaveBeenCalledWith(
        'chat:chat-1',
        'presence:changed',
        expect.objectContaining({
          chatId: 'chat-1',
        }),
      );

      // Verifica emisión GLOBAL al comercial con affectedChatIds
      expect(mockWebSocketGateway.emitToRoom).toHaveBeenCalledWith(
        `commercial:${commercialId}`,
        'presence:changed',
        expect.objectContaining({
          affectedChatIds: ['chat-1'],
        }),
      );
    });

    it('debe agrupar chatIds en evento global si tiene múltiples chats con el mismo comercial', async () => {
      // Arrange
      const visitorId = '550e8400-e29b-41d4-a716-446655440000';
      const commercialId = 'commercial-456';

      const event = new PresenceChangedEvent(
        visitorId,
        'visitor',
        'offline',
        'online',
        'tenant-123',
      );

      // Mock de 2 chats con el mismo comercial
      const mockChat1 = {
        toPrimitives: () => ({
          id: 'chat-1',
          visitorId,
          assignedCommercialId: commercialId,
          status: ChatStatusEnum.ACTIVE,
        }),
      } as unknown as Chat;

      const mockChat2 = {
        toPrimitives: () => ({
          id: 'chat-2',
          visitorId,
          assignedCommercialId: commercialId,
          status: ChatStatusEnum.ASSIGNED,
        }),
      } as unknown as Chat;

      mockChatRepository.findByVisitorId.mockResolvedValue(
        ok([mockChat1, mockChat2]),
      );

      // Act
      await handler.handle(event);

      // Assert
      // Emisión dual: 1 visitante + 2 granulares (chat:id) + 1 global (commercial:id con affectedChatIds)
      expect(mockWebSocketGateway.emitToRoom).toHaveBeenCalledTimes(4);

      // Verifica emisión GRANULAR a cada sala de chat
      expect(mockWebSocketGateway.emitToRoom).toHaveBeenCalledWith(
        'chat:chat-1',
        'presence:changed',
        expect.objectContaining({ chatId: 'chat-1' }),
      );
      expect(mockWebSocketGateway.emitToRoom).toHaveBeenCalledWith(
        'chat:chat-2',
        'presence:changed',
        expect.objectContaining({ chatId: 'chat-2' }),
      );

      // Cuenta cuántas veces se emitió al comercial (debe ser 1 evento global)
      const commercialEmissions =
        mockWebSocketGateway.emitToRoom.mock.calls.filter(
          (call) => call[0] === `commercial:${commercialId}`,
        );
      expect(commercialEmissions).toHaveLength(1);

      // Verifica que el evento global incluye AMBOS chatIds
      expect(mockWebSocketGateway.emitToRoom).toHaveBeenCalledWith(
        `commercial:${commercialId}`,
        'presence:changed',
        expect.objectContaining({
          affectedChatIds: expect.arrayContaining(['chat-1', 'chat-2']),
        }),
      );
    });

    it('no debe notificar si los chats no tienen comercial asignado', async () => {
      // Arrange
      const visitorId = '550e8400-e29b-41d4-a716-446655440000';
      const event = new PresenceChangedEvent(
        visitorId,
        'visitor',
        'offline',
        'online',
        'tenant-123',
      );

      const mockChat = {
        toPrimitives: () => ({
          id: 'chat-1',
          visitorId,
          assignedCommercialId: null, // Sin comercial asignado
          status: ChatStatusEnum.PENDING,
        }),
      } as unknown as Chat;

      mockChatRepository.findByVisitorId.mockResolvedValue(ok([mockChat]));

      // Act
      await handler.handle(event);

      // Assert
      // Solo debe emitir al visitante
      expect(mockWebSocketGateway.emitToRoom).toHaveBeenCalledTimes(1);
      expect(mockWebSocketGateway.emitToRoom).toHaveBeenCalledWith(
        `visitor:${visitorId}`,
        'presence:changed',
        expect.any(Object),
      );
    });
  });

  describe('handle - Comercial cambia presencia', () => {
    it('debe emitir eventos granulares a salas de chat y globales a visitantes', async () => {
      // Arrange
      const commercialId = '650e8400-e29b-41d4-a716-446655440010';
      const visitor1Id = '550e8400-e29b-41d4-a716-446655440011';
      const visitor2Id = '550e8400-e29b-41d4-a716-446655440012';

      const event = new PresenceChangedEvent(
        commercialId,
        'commercial',
        'offline',
        'online',
        'tenant-123',
      );

      // Mock de chats activos con 2 visitantes diferentes
      const mockChat1 = {
        toPrimitives: () => ({
          id: 'chat-1',
          visitorId: visitor1Id,
          assignedCommercialId: commercialId,
          status: ChatStatusEnum.ACTIVE,
        }),
      } as unknown as Chat;

      const mockChat2 = {
        toPrimitives: () => ({
          id: 'chat-2',
          visitorId: visitor2Id,
          assignedCommercialId: commercialId,
          status: ChatStatusEnum.ASSIGNED,
        }),
      } as unknown as Chat;

      mockChatRepository.findByCommercialId.mockResolvedValue(
        ok({
          chats: [mockChat1, mockChat2],
          total: 2,
          hasMore: false,
        }),
      );

      // Act
      await handler.handle(event);

      // Assert
      // Emisión dual: 1 comercial + 2 granulares (chat:id) + 2 globales (visitor:id)
      expect(mockWebSocketGateway.emitToRoom).toHaveBeenCalledTimes(5);

      // Verifica emisión a sala del comercial
      expect(mockWebSocketGateway.emitToRoom).toHaveBeenCalledWith(
        `commercial:${commercialId}`,
        'presence:changed',
        expect.objectContaining({
          userId: commercialId,
          userType: 'commercial',
          status: 'online',
          previousStatus: 'offline',
        }),
      );

      // Verifica emisión GRANULAR a sala de chat 1
      expect(mockWebSocketGateway.emitToRoom).toHaveBeenCalledWith(
        'chat:chat-1',
        'presence:changed',
        expect.objectContaining({
          userId: commercialId,
          userType: 'commercial',
          status: 'online',
          chatId: 'chat-1',
        }),
      );

      // Verifica emisión GRANULAR a sala de chat 2
      expect(mockWebSocketGateway.emitToRoom).toHaveBeenCalledWith(
        'chat:chat-2',
        'presence:changed',
        expect.objectContaining({
          userId: commercialId,
          userType: 'commercial',
          status: 'online',
          chatId: 'chat-2',
        }),
      );

      // Verifica emisión GLOBAL a visitante 1 con affectedChatIds
      expect(mockWebSocketGateway.emitToRoom).toHaveBeenCalledWith(
        `visitor:${visitor1Id}`,
        'presence:changed',
        expect.objectContaining({
          userId: commercialId,
          userType: 'commercial',
          status: 'online',
          affectedChatIds: ['chat-1'],
        }),
      );

      // Verifica emisión GLOBAL a visitante 2 con affectedChatIds
      expect(mockWebSocketGateway.emitToRoom).toHaveBeenCalledWith(
        `visitor:${visitor2Id}`,
        'presence:changed',
        expect.objectContaining({
          userId: commercialId,
          userType: 'commercial',
          status: 'online',
          affectedChatIds: ['chat-2'],
        }),
      );

      // NO debe emitir a sala de tenant
      expect(mockWebSocketGateway.emitToRoom).not.toHaveBeenCalledWith(
        expect.stringContaining('tenant:'),
        expect.anything(),
        expect.anything(),
      );
    });

    it('debe notificar solo al comercial si no tiene chats activos', async () => {
      // Arrange
      const commercialId = '650e8400-e29b-41d4-a716-446655440010';
      const event = new PresenceChangedEvent(
        commercialId,
        'commercial',
        'offline',
        'online',
        'tenant-123',
      );

      mockChatRepository.findByCommercialId.mockResolvedValue(
        ok({
          chats: [],
          total: 0,
          hasMore: false,
        }),
      );

      // Act
      await handler.handle(event);

      // Assert
      // Solo debe emitir 1 vez: al propio comercial
      expect(mockWebSocketGateway.emitToRoom).toHaveBeenCalledTimes(1);
      expect(mockWebSocketGateway.emitToRoom).toHaveBeenCalledWith(
        `commercial:${commercialId}`,
        'presence:changed',
        expect.any(Object),
      );
    });
  });

  describe('handle - Sin WebSocketGateway', () => {
    it('no debe emitir nada si el gateway no está disponible', async () => {
      // Arrange
      const handlerWithoutGateway =
        new NotifyPresenceChangedOnPresenceChangedEventHandler(
          null as any,
          mockChatRepository,
        );

      const event = new PresenceChangedEvent(
        '550e8400-e29b-41d4-a716-446655440099',
        'visitor',
        'offline',
        'online',
        'tenant-123',
      );

      // Act
      await handlerWithoutGateway.handle(event);

      // Assert
      expect(mockWebSocketGateway.emitToRoom).not.toHaveBeenCalled();
    });
  });

  describe('handle - Sin ChatRepository', () => {
    it('debe emitir solo a sala del usuario si el repositorio no está disponible', async () => {
      // Arrange
      const handlerWithoutRepo =
        new NotifyPresenceChangedOnPresenceChangedEventHandler(
          mockWebSocketGateway,
          null as any,
        );

      const visitorId = '550e8400-e29b-41d4-a716-446655440000';
      const event = new PresenceChangedEvent(
        visitorId,
        'visitor',
        'offline',
        'online',
        'tenant-123',
      );

      // Act
      await handlerWithoutRepo.handle(event);

      // Assert
      // Solo debe emitir al propio usuario
      expect(mockWebSocketGateway.emitToRoom).toHaveBeenCalledTimes(1);
      expect(mockWebSocketGateway.emitToRoom).toHaveBeenCalledWith(
        `visitor:${visitorId}`,
        'presence:changed',
        expect.any(Object),
      );
    });
  });

  describe('handle - Manejo de errores', () => {
    it('no debe lanzar error si la consulta de chats falla', async () => {
      // Arrange
      const visitorId = '550e8400-e29b-41d4-a716-446655440000';
      const event = new PresenceChangedEvent(
        visitorId,
        'visitor',
        'offline',
        'online',
        'tenant-123',
      );

      mockChatRepository.findByVisitorId.mockRejectedValue(
        new Error('Database error'),
      );

      // Act & Assert
      await expect(handler.handle(event)).resolves.not.toThrow();

      // Debe emitir al menos a la sala del usuario
      expect(mockWebSocketGateway.emitToRoom).toHaveBeenCalledWith(
        `visitor:${visitorId}`,
        'presence:changed',
        expect.any(Object),
      );
    });
  });
});
