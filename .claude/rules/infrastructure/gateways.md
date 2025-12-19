# WebSocket Gateways

## Description

Gateways for bidirectional real-time communication with Socket.IO.

## Reference

`src/websocket/websocket.gateway.ts`

## Base Structure

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

## Message Handlers

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

  // Join the room
  const roomName = `chat:${chatId}`;
  await client.join(roomName);

  this.logger.log(`Cliente ${client.id} unido a sala ${roomName}`);

  // Notify the client
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
    // Validate data
    if (!data.chatId || !data.content) {
      return { success: false, message: 'Datos incompletos' };
    }

    // Execute command
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

## Event Emission

```typescript
// To a specific room
emitToRoom(room: string, event: string, data: unknown): void {
  this.server.to(room).emit(event, data);
}

// To multiple rooms
emitToRooms(rooms: string[], event: string, data: unknown): void {
  rooms.forEach(room => {
    this.server.to(room).emit(event, data);
  });
}

// Global broadcast
broadcast(event: string, data: unknown): void {
  this.server.emit(event, data);
}

// To a specific client
emitToClient(clientId: string, event: string, data: unknown): void {
  this.server.to(clientId).emit(event, data);
}
```

## Room Types

| Room | Format | Usage |
|------|--------|-------|
| Chat | `chat:{chatId}` | Messages and chat states |
| Commercials | `chat:{chatId}:commercial` | Commercial users only |
| Visitor | `visitor:{visitorId}` | Proactive notifications |
| Company | `tenant:{companyId}` | Company-wide notifications |

## Available Guards

| Guard | Usage |
|-------|-------|
| `WsAuthGuard` | Mandatory JWT authentication for WebSocket |
| `WsRolesGuard` + `@Roles([])` | Verify roles in WebSocket handlers |

```typescript
@UseGuards(WsAuthGuard, WsRolesGuard)
@SubscribeMessage('chat:send-message')
@Roles(['visitor', 'commercial'])
async handleSendMessage(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
  // Handler with authentication and role verification
}
```

## Authentication

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

    // Store user data in socket
    client.data = {
      userId: decoded.sub,
      roles: decoded.roles || [],
      companyId: decoded.companyId,
    };

    // Join rooms based on role
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

## Connection Tracking

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

// Get connected users
getConnectedUsers(): string[] {
  return Array.from(this.clientUsers.values()).map(u => u.userId);
}
```

## Naming Rules

| Element | Pattern | Example |
|---------|---------|---------|
| Gateway | `<Feature>Gateway` | `ChatGateway` |
| File | `<feature>.gateway.ts` | `chat.gateway.ts` |
| Input event | `<feature>:<action>` | `chat:send-message` |
| Output event | `<feature>:<event>` | `chat:message-received` |

## Anti-patterns

- Domain logic in gateways
- Missing authentication
- Handlers without payload validation
- Not using rooms for segmentation
- Unhandled exceptions
