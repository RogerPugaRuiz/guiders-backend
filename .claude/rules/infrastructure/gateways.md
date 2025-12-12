# WebSocket Gateways

## Descripción

Gateways para comunicación bidireccional en tiempo real con Socket.IO.

## Referencia

`src/websocket/websocket.gateway.ts`

## Estructura Base

```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
  path: '/socket.io/',
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 20000,
})
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('ChatGateway');

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  afterInit() {
    this.logger.log('WebSocket Gateway inicializado');
  }

  async handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);
    await this.authenticateClient(client);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);
    await this.cleanupClient(client);
  }
}
```

## Handlers de Mensajes

```typescript
@SubscribeMessage('chat:join')
async handleJoinChat(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { chatId: string },
) {
  const { chatId } = data;

  if (!chatId) {
    return { success: false, message: 'chatId es requerido' };
  }

  // Unirse a la sala
  const roomName = `chat:${chatId}`;
  await client.join(roomName);

  this.logger.log(`Cliente ${client.id} unido a sala ${roomName}`);

  // Notificar al cliente
  client.emit('chat:joined', {
    chatId,
    roomName,
    timestamp: Date.now(),
  });

  return { success: true, message: 'Unido a sala exitosamente' };
}

@SubscribeMessage('chat:send-message')
async handleSendMessage(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: SendMessagePayload,
) {
  try {
    // Validar datos
    if (!data.chatId || !data.content) {
      return { success: false, message: 'Datos incompletos' };
    }

    // Ejecutar comando
    const result = await this.commandBus.execute(
      new SendMessageCommand(data.chatId, data.content, client.data.userId),
    );

    if (result.isErr()) {
      return { success: false, message: result.error.message };
    }

    return { success: true, messageId: result.unwrap() };
  } catch (error) {
    this.logger.error(`Error enviando mensaje: ${error.message}`);
    return { success: false, message: 'Error interno' };
  }
}
```

## Emisión de Eventos

```typescript
// A una sala específica
emitToRoom(room: string, event: string, data: unknown): void {
  this.server.to(room).emit(event, data);
}

// A múltiples salas
emitToRooms(rooms: string[], event: string, data: unknown): void {
  rooms.forEach(room => {
    this.server.to(room).emit(event, data);
  });
}

// Broadcast global
broadcast(event: string, data: unknown): void {
  this.server.emit(event, data);
}

// A un cliente específico
emitToClient(clientId: string, event: string, data: unknown): void {
  this.server.to(clientId).emit(event, data);
}
```

## Tipos de Salas

| Sala | Formato | Uso |
|------|---------|-----|
| Chat | `chat:{chatId}` | Mensajes y estados del chat |
| Comerciales | `chat:{chatId}:commercial` | Solo para comerciales |
| Visitante | `visitor:{visitorId}` | Notificaciones proactivas |
| Empresa | `tenant:{companyId}` | Notificaciones empresariales |

## Autenticación

```typescript
private async authenticateClient(client: Socket): Promise<void> {
  try {
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      this.logger.warn(`Cliente ${client.id} sin token`);
      return;
    }

    const decoded = this.tokenService.verify(token);

    // Guardar datos del usuario en el socket
    client.data = {
      userId: decoded.sub,
      roles: decoded.roles || [],
      companyId: decoded.companyId,
    };

    // Unir a salas según rol
    if (decoded.roles.includes('commercial')) {
      await client.join(`commercial:${decoded.sub}`);
    }
    if (decoded.companyId) {
      await client.join(`tenant:${decoded.companyId}`);
    }

    this.logger.log(`Usuario autenticado: ${decoded.sub}`);
  } catch (error) {
    this.logger.warn(`Error autenticación: ${error.message}`);
  }
}
```

## Tracking de Conexiones

```typescript
private clientUsers = new Map<string, {
  userId: string;
  roles: string[];
  companyId?: string;
}>();

async handleConnection(client: Socket) {
  await this.authenticateClient(client);

  if (client.data.userId) {
    this.clientUsers.set(client.id, {
      userId: client.data.userId,
      roles: client.data.roles,
      companyId: client.data.companyId,
    });
  }
}

async handleDisconnect(client: Socket) {
  this.clientUsers.delete(client.id);
}

// Obtener usuarios conectados
getConnectedUsers(): string[] {
  return Array.from(this.clientUsers.values()).map(u => u.userId);
}
```

## Reglas de Naming

| Elemento | Patrón | Ejemplo |
|----------|--------|---------|
| Gateway | `<Feature>Gateway` | `ChatGateway` |
| Archivo | `<feature>.gateway.ts` | `chat.gateway.ts` |
| Evento entrada | `<feature>:<action>` | `chat:send-message` |
| Evento salida | `<feature>:<event>` | `chat:message-received` |

## Anti-patrones

- Lógica de dominio en gateways
- Falta de autenticación
- Handlers sin validación de payload
- No usar salas (rooms) para segmentar
- Excepciones no controladas
