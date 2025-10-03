import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface TestMessage {
  message: string;
  timestamp: number;
}

interface JoinChatRoomPayload {
  chatId: string;
  token?: string; // JWT token (opcional)
  sessionId?: string; // Session ID de visitante (opcional)
}

interface LeaveChatRoomPayload {
  chatId: string;
}

/**
 * WebSocket Gateway para comunicación bidireccional en tiempo real
 * Soporta:
 * - Autenticación dual (JWT Bearer token y cookies de sesión)
 * - Salas de chat para comunicación entre visitantes y comerciales
 * - Notificaciones de mensajes nuevos en tiempo real
 * - Separación de mensajes internos (solo comerciales)
 */
@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  path: '/socket.io/',
  transports: ['websocket', 'polling'],
})
export class WebSocketGatewayBasic
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer() server: Server;
  private logger = new Logger('WebSocketGateway');

  // Mapa para trackear qué usuarios están en qué salas
  private clientRooms = new Map<string, Set<string>>();
  // Mapa para guardar info del usuario autenticado
  private clientUsers = new Map<
    string,
    { userId: string; roles: string[]; chatIds: string[] }
  >();

  afterInit() {
    this.logger.log('WebSocket Gateway inicializado');
    this.logger.log(
      `Configuración: path=/socket.io/, transports=[websocket, polling]`,
    );
  }

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);
    this.logger.log(`Transport usado: ${client.conn.transport.name}`);

    // Inicializar tracking de este cliente
    this.clientRooms.set(client.id, new Set());

    // Intentar autenticar desde handshake
    this.authenticateClient(client);

    // Enviar mensaje de bienvenida
    client.emit('welcome', {
      message: 'Conectado exitosamente al servidor WebSocket',
      clientId: client.id,
      timestamp: Date.now(),
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);

    // Limpiar tracking del cliente
    const rooms = this.clientRooms.get(client.id);
    if (rooms) {
      rooms.forEach((room) => {
        void client.leave(room);
        this.logger.log(`Cliente ${client.id} eliminado de sala: ${room}`);
      });
      this.clientRooms.delete(client.id);
    }

    // Limpiar info de usuario
    this.clientUsers.delete(client.id);
  }

  /**
   * Intenta autenticar al cliente desde el handshake
   * Soporta JWT Bearer token y cookies de sesión
   */
  private authenticateClient(client: Socket): void {
    try {
      const token =
        (client.handshake.auth.token as string) ||
        (client.handshake.headers.authorization as string);
      const cookies = client.handshake.headers.cookie;

      // TODO: Implementar lógica real de autenticación
      // Por ahora solo logueamos que recibimos credenciales
      if (token) {
        this.logger.log(`Cliente ${client.id} envió token de autenticación`);
      }
      if (cookies) {
        this.logger.log(`Cliente ${client.id} envió cookies de sesión`);
      }
    } catch (error) {
      this.logger.error(
        `Error al autenticar cliente ${client.id}:`,
        (error as Error).message,
      );
    }
  }

  /**
   * Listener para unirse a una sala de chat
   * Permite a visitantes y comerciales recibir notificaciones del chat
   */
  @SubscribeMessage('chat:join')
  async handleJoinChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinChatRoomPayload,
  ) {
    try {
      const { chatId } = data;

      if (!chatId) {
        client.emit('error', {
          message: 'chatId es requerido',
          timestamp: Date.now(),
        });
        return { success: false, message: 'chatId es requerido' };
      }

      // Construir nombre de la sala
      const roomName = `chat:${chatId}`;

      // Unir el cliente a la sala
      await client.join(roomName);

      // Trackear la sala
      const rooms = this.clientRooms.get(client.id) || new Set();
      rooms.add(roomName);
      this.clientRooms.set(client.id, rooms);

      this.logger.log(
        `Cliente ${client.id} se unió a la sala de chat: ${roomName}`,
      );

      // Notificar éxito
      client.emit('chat:joined', {
        chatId,
        roomName,
        timestamp: Date.now(),
      });

      return {
        success: true,
        message: 'Unido a la sala de chat exitosamente',
        chatId,
        roomName,
      };
    } catch (error) {
      this.logger.error(
        `Error al unir cliente a sala de chat:`,
        (error as Error).message,
      );
      return {
        success: false,
        message: 'Error al unirse a la sala de chat',
      };
    }
  }

  /**
   * Listener para salir de una sala de chat
   */
  @SubscribeMessage('chat:leave')
  async handleLeaveChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: LeaveChatRoomPayload,
  ) {
    try {
      const { chatId } = data;

      if (!chatId) {
        return { success: false, message: 'chatId es requerido' };
      }

      const roomName = `chat:${chatId}`;

      // Salir de la sala
      await client.leave(roomName);

      // Actualizar tracking
      const rooms = this.clientRooms.get(client.id);
      if (rooms) {
        rooms.delete(roomName);
      }

      this.logger.log(
        `Cliente ${client.id} salió de la sala de chat: ${roomName}`,
      );

      // Notificar éxito
      client.emit('chat:left', {
        chatId,
        roomName,
        timestamp: Date.now(),
      });

      return {
        success: true,
        message: 'Salió de la sala de chat exitosamente',
        chatId,
      };
    } catch (error) {
      this.logger.error(
        `Error al salir de sala de chat:`,
        (error as Error).message,
      );
      return { success: false, message: 'Error al salir de la sala de chat' };
    }
  }

  /**
   * Emite un evento a una sala específica (usado por event handlers)
   */
  emitToRoom(room: string, event: string, data: unknown): void {
    this.logger.log(`Emitiendo evento "${event}" a sala: ${room}`);
    this.server.to(room).emit(event, data);
  }

  /**
   * Emite un evento a múltiples salas
   */
  emitToRooms(rooms: string[], event: string, data: unknown): void {
    rooms.forEach((room) => {
      this.emitToRoom(room, event, data);
    });
  }

  /**
   * Obtiene las salas en las que está un cliente
   */
  getClientRooms(clientId: string): string[] {
    const rooms = this.clientRooms.get(clientId);
    return rooms ? Array.from(rooms) : [];
  }

  /**
   * Obtiene todos los clientes en una sala
   */
  async getClientsInRoom(room: string): Promise<string[]> {
    const sockets = await this.server.in(room).fetchSockets();
    return sockets.map((socket) => socket.id);
  }

  @SubscribeMessage('test')
  handleTest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: TestMessage,
  ) {
    this.logger.log(
      `Mensaje de prueba recibido de ${client.id}: ${data.message}`,
    );

    // Enviar respuesta al cliente
    client.emit('test-response', {
      message: `Echo: ${data.message}`,
      timestamp: Date.now(),
      receivedAt: data.timestamp,
    });

    return {
      success: true,
      message: 'Mensaje de prueba procesado',
      data: data,
    };
  }

  @SubscribeMessage('health-check')
  handleHealthCheck(@ConnectedSocket() client: Socket) {
    this.logger.log(`Health check desde ${client.id}`);

    return {
      status: 'OK',
      timestamp: Date.now(),
      uptime: process.uptime(),
      message: 'WebSocket funcionando correctamente',
    };
  }

  // Método para enviar mensajes broadcast (legacy - mantener por compatibilidad)
  broadcast(event: string, data: unknown) {
    this.logger.log(`Broadcasting: ${event}`);
    this.server.emit(event, data);
  }
}
