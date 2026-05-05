import { Test, TestingModule } from '@nestjs/testing';
import { WebSocketGatewayBasic } from '../websocket.gateway';
import { Socket } from 'socket.io';
import { TokenVerifyService } from '../../context/shared/infrastructure/token-verify.service';

describe('WebSocketGatewayBasic - Presence Handlers', () => {
  let gateway: WebSocketGatewayBasic;
  let mockSocket: Partial<Socket>;
  let mockTokenVerifyService: jest.Mocked<TokenVerifyService>;

  beforeEach(async () => {
    // Mock del socket
    mockSocket = {
      id: 'test-socket-id',
      join: jest.fn().mockResolvedValue(undefined),
      leave: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
      handshake: {
        auth: {},
        headers: {},
      } as any,
      conn: {
        transport: { name: 'websocket' },
      } as any,
    };

    // Mock del TokenVerifyService
    mockTokenVerifyService = {
      verifyToken: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebSocketGatewayBasic,
        {
          provide: TokenVerifyService,
          useValue: mockTokenVerifyService,
        },
      ],
    }).compile();

    gateway = module.get<WebSocketGatewayBasic>(WebSocketGatewayBasic);

    // Inicializar el server mock
    gateway.server = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      in: jest.fn().mockReturnValue({
        fetchSockets: jest.fn().mockResolvedValue([]),
      }),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('presence:join handler', () => {
    it('debe unir un comercial a su sala de presencia correctamente', async () => {
      // Arrange
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const userType: 'commercial' | 'visitor' = 'commercial';
      const payload = { userId, userType };

      // Act
      const result = await gateway.handleJoinPresenceRoom(
        mockSocket as Socket,
        payload,
      );

      // Assert
      expect(mockSocket.join).toHaveBeenCalledWith(`${userType}:${userId}`);
      expect(mockSocket.emit).toHaveBeenCalledWith('presence:joined', {
        userId,
        userType,
        roomName: `${userType}:${userId}`,
        timestamp: expect.any(Number),
      });
      expect(result).toEqual({
        success: true,
        message: 'Unido a sala de presencia exitosamente',
        userId,
        userType,
        roomName: `${userType}:${userId}`,
      });
    });

    it('debe unir un visitante a su sala de presencia correctamente', async () => {
      // Arrange
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      const userType: 'commercial' | 'visitor' = 'visitor';
      const payload = { userId, userType };

      // Act
      const result = await gateway.handleJoinPresenceRoom(
        mockSocket as Socket,
        payload,
      );

      // Assert
      expect(mockSocket.join).toHaveBeenCalledWith(`${userType}:${userId}`);
      expect(result.success).toBe(true);
      expect(result.roomName).toBe(`${userType}:${userId}`);
    });

    it('debe rechazar si no se proporciona userId', async () => {
      // Arrange
      const payload = { userId: '', userType: 'commercial' } as any;

      // Act
      const result = await gateway.handleJoinPresenceRoom(
        mockSocket as Socket,
        payload,
      );

      // Assert
      expect(mockSocket.join).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.message).toContain('requerido');
      expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.any(Object));
    });

    it('debe rechazar si no se proporciona userType', async () => {
      // Arrange
      const payload = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        userType: '',
      } as any;

      // Act
      const result = await gateway.handleJoinPresenceRoom(
        mockSocket as Socket,
        payload,
      );

      // Assert
      expect(mockSocket.join).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
    });

    it('debe rechazar si userType es inválido', async () => {
      // Arrange
      const payload = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        userType: 'invalid',
      } as any;

      // Act
      const result = await gateway.handleJoinPresenceRoom(
        mockSocket as Socket,
        payload,
      );

      // Assert
      expect(mockSocket.join).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.message).toContain('inválido');
      expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.any(Object));
    });

    it('debe trackear la sala correctamente', async () => {
      // Arrange
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const userType: 'commercial' | 'visitor' = 'commercial';
      const payload = { userId, userType };

      // Act
      await gateway.handleJoinPresenceRoom(mockSocket as Socket, payload);

      // Assert
      const rooms = gateway.getClientRooms(mockSocket.id as string);
      expect(rooms).toContain(`${userType}:${userId}`);
    });
  });

  describe('presence:leave handler', () => {
    it('debe salir de una sala de presencia correctamente', async () => {
      // Arrange
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const userType: 'commercial' | 'visitor' = 'commercial';
      const payload = { userId, userType };

      // Primero unirse
      await gateway.handleJoinPresenceRoom(mockSocket as Socket, payload);

      // Act - Luego salir
      const result = await gateway.handleLeavePresenceRoom(
        mockSocket as Socket,
        payload,
      );

      // Assert
      expect(mockSocket.leave).toHaveBeenCalledWith(`${userType}:${userId}`);
      expect(mockSocket.emit).toHaveBeenCalledWith('presence:left', {
        userId,
        userType,
        roomName: `${userType}:${userId}`,
        timestamp: expect.any(Number),
      });
      expect(result).toEqual({
        success: true,
        message: 'Salió de sala de presencia exitosamente',
        userId,
        userType,
      });
    });

    it('debe rechazar si no se proporciona userId', async () => {
      // Arrange
      const payload = { userId: '', userType: 'commercial' } as any;

      // Act
      const result = await gateway.handleLeavePresenceRoom(
        mockSocket as Socket,
        payload,
      );

      // Assert
      expect(mockSocket.leave).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.message).toContain('requerido');
    });

    it('debe actualizar tracking al salir de la sala', async () => {
      // Arrange
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const userType: 'commercial' | 'visitor' = 'visitor';
      const payload = { userId, userType };

      // Primero unirse
      await gateway.handleJoinPresenceRoom(mockSocket as Socket, payload);

      // Verificar que está trackeado
      let rooms = gateway.getClientRooms(mockSocket.id as string);
      expect(rooms).toContain(`${userType}:${userId}`);

      // Act - Salir
      await gateway.handleLeavePresenceRoom(mockSocket as Socket, payload);

      // Assert - Ya no debe estar trackeado
      rooms = gateway.getClientRooms(mockSocket.id as string);
      expect(rooms).not.toContain(`${userType}:${userId}`);
    });
  });

  describe('Auto-join durante autenticación', () => {
    it('debe unir automáticamente a sala de presencia al autenticar comercial', async () => {
      // Arrange
      const commercialId = '550e8400-e29b-41d4-a716-446655440010';
      const companyId = 'company-123';

      // Crear un nuevo socket con handshake actualizado
      const mockSocketWithAuth = {
        ...mockSocket,
        handshake: {
          auth: { token: 'valid-token' },
          headers: {},
        },
      } as unknown as Socket;

      mockTokenVerifyService.verifyToken.mockResolvedValue({
        sub: commercialId,
        role: ['commercial'],
        companyId,
      } as any);

      // Act
      await gateway.handleConnection(mockSocketWithAuth);

      // Assert
      expect(mockSocket.join).toHaveBeenCalledWith(
        `commercial:${commercialId}`,
      );
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'presence:joined',
        expect.objectContaining({
          userId: commercialId,
          userType: 'commercial',
          roomName: `commercial:${commercialId}`,
          automatic: true,
        }),
      );
    });

    it('debe unir automáticamente a sala de presencia al autenticar visitante', async () => {
      // Arrange
      const visitorId = '550e8400-e29b-41d4-a716-446655440020';

      // Crear un nuevo socket con handshake actualizado
      const mockSocketWithAuth = {
        ...mockSocket,
        handshake: {
          auth: { token: 'valid-token' },
          headers: {},
        },
      } as unknown as Socket;

      mockTokenVerifyService.verifyToken.mockResolvedValue({
        sub: visitorId,
        role: ['visitor'],
      } as any);

      // Act
      await gateway.handleConnection(mockSocketWithAuth);

      // Assert
      expect(mockSocket.join).toHaveBeenCalledWith(`visitor:${visitorId}`);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'presence:joined',
        expect.objectContaining({
          userId: visitorId,
          userType: 'visitor',
          roomName: `visitor:${visitorId}`,
          automatic: true,
        }),
      );
    });
  });

  describe('Integración con emitToRoom', () => {
    it('debe emitir eventos a la sala de presencia correctamente', () => {
      // Arrange
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const userType = 'commercial';
      const roomName = `${userType}:${userId}`;
      const eventData = { status: 'online', userId };

      // Act
      gateway.emitToRoom(roomName, 'presence:changed', eventData);

      // Assert
      expect(gateway.server.to).toHaveBeenCalledWith(roomName);
      expect(gateway.server.emit).toHaveBeenCalledWith(
        'presence:changed',
        eventData,
      );
    });
  });

  describe('tenant:join handler - validación anti tenant-hopping', () => {
    const tenantId = '550e8400-e29b-41d4-a716-446655440099';

    it('debe permitir a un comercial unirse a su propio tenant', async () => {
      // Simular comercial autenticado registrado en clientUsers
      const commercialId = '550e8400-e29b-41d4-a716-446655440050';
      (gateway as any).clientUsers.set(mockSocket.id, {
        userId: commercialId,
        roles: ['commercial'],
        chatIds: [],
        tenantId,
      });

      const result = await gateway.handleJoinTenantRoom(mockSocket as Socket, {
        tenantId,
      });

      expect(result.success).toBe(true);
      expect(mockSocket.join).toHaveBeenCalledWith(`tenant:${tenantId}`);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'tenant:joined',
        expect.objectContaining({ companyId: tenantId }),
      );
    });

    it('debe bloquear tenant-hopping: comercial que intenta unirse a otro tenant', async () => {
      const commercialId = '550e8400-e29b-41d4-a716-446655440051';
      const otherTenant = '550e8400-e29b-41d4-a716-999999999999';

      // Registrar comercial con tenantId diferente al solicitado
      (gateway as any).clientUsers.set(mockSocket.id, {
        userId: commercialId,
        roles: ['commercial'],
        chatIds: [],
        tenantId,
      });

      const result = await gateway.handleJoinTenantRoom(mockSocket as Socket, {
        tenantId: otherTenant,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('autorizado');
      expect(mockSocket.join).not.toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({
          message: expect.stringContaining('autorizado'),
        }),
      );
    });

    it('debe permitir unirse si el comercial no tiene tenantId registrado (legacy/sin JWT tenant)', async () => {
      const commercialId = '550e8400-e29b-41d4-a716-446655440052';

      // Comercial autenticado pero sin tenantId (no debe ser bloqueado)
      (gateway as any).clientUsers.set(mockSocket.id, {
        userId: commercialId,
        roles: ['commercial'],
        chatIds: [],
        tenantId: undefined,
        companyId: undefined,
      });

      const result = await gateway.handleJoinTenantRoom(mockSocket as Socket, {
        tenantId,
      });

      expect(result.success).toBe(true);
      expect(mockSocket.join).toHaveBeenCalledWith(`tenant:${tenantId}`);
    });

    it('debe permitir a un visitante (no comercial) unirse a cualquier tenant', async () => {
      const visitorId = '550e8400-e29b-41d4-a716-446655440053';

      (gateway as any).clientUsers.set(mockSocket.id, {
        userId: visitorId,
        roles: ['visitor'],
        chatIds: [],
        tenantId: 'another-tenant',
      });

      const result = await gateway.handleJoinTenantRoom(mockSocket as Socket, {
        tenantId,
      });

      // Visitantes no tienen restricción de tenant-hopping
      expect(result.success).toBe(true);
      expect(mockSocket.join).toHaveBeenCalledWith(`tenant:${tenantId}`);
    });

    it('debe rechazar si no se proporciona tenantId', async () => {
      const result = await gateway.handleJoinTenantRoom(mockSocket as Socket, {
        tenantId: '',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('requerido');
      expect(mockSocket.join).not.toHaveBeenCalled();
    });
  });
});
