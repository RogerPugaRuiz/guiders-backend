# Contexto Real-Time

Este contexto gestiona la lógica de tiempo real (por ejemplo, conexiones de usuarios, asignaciones comerciales) siguiendo DDD y CQRS con NestJS v11 y @nestjs/cqrs.

## Estructura

- **application/**: Lógica de aplicación (commands, events, queries, dtos, usecases).
- **domain/**: Entidades, servicios de dominio, repositorios y eventos.
- **infrastructure/**: Adaptadores, persistencia y controladores.

### Componentes principales

- **Conexiones de WebSocket**: Gestión de conexiones de usuarios y visitantes.
- **Mensajería en tiempo real**: Envío y recepción de mensajes instantáneos.
- **Notificaciones en directo**: Sistema de notificaciones para usuarios conectados.
- **Estado de conexión**: Seguimiento del estado de los usuarios (conectado/desconectado).

## Principios

- **DDD**: El dominio modela las reglas y procesos de negocio de tiempo real.
- **CQRS**: Comandos y queries separados para claridad y escalabilidad.
- **Eventos**: Los cambios relevantes generan eventos manejados por EventHandlers.

## Diagrama de clases

El contexto de Real-Time implementa un sistema basado en el siguiente diagrama de clases:

![Diagrama de Clases de Real-Time](/realTimeContextClassDiagram.mmd)

## Flujos principales

### Conexión de usuario

```
┌───────────┐     ┌─────────────────┐     ┌──────────────────┐
│  Cliente  │────▶│ WebSocketGateway│────▶│ ConnectionService│
└───────────┘     └─────────────────┘     └──────────────────┘
                          │                         │
                          ▼                         ▼
                  ┌─────────────────┐     ┌──────────────────┐
                  │ Autenticación   │     │ Evento Connected │
                  └─────────────────┘     └──────────────────┘
```

### Envío de mensajes en tiempo real

```typescript
// En el WebSocket Gateway
@SubscribeMessage('chat:message')
async handleClientSendMessage(
  client: AuthenticatedSocket,
  event: { to: string; message: string },
): Promise<void> {
  const { to, message } = event;
  const from = client.user.id;
  
  // Buscar usuarios
  const fromUser = await this.connectionRepository.findOne(
    new UserIdCriteria(from),
  );
  const toUser = await this.connectionRepository.findOne(
    new UserIdCriteria(to),
  );
  
  if (fromUser.isFailure() || toUser.isFailure()) {
    return;
  }
  
  // Emitir mensaje
  const result = await this.chatMessageEmitter.emit(
    fromUser.value(),
    toUser.value(),
    message,
    new Date(),
  );
  
  if (result.isFailure()) {
    client.emit('error', { message: 'User not connected' });
  }
}
```

## Ejemplos de uso

### Conexión de cliente WebSocket

```typescript
// Desde el cliente
const socket = io('http://localhost:3000', {
  auth: {
    token: accessToken,
  },
});

socket.on('connect', () => {
  console.log('Conectado al servidor');
});

socket.on('disconnect', () => {
  console.log('Desconectado del servidor');
});
```

### Manejo de conexiones en el servidor

```typescript
@WebSocketGateway({ cors: { origin: '*' } })
export class RealTimeWebSocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect {
  
  constructor(
    @Inject(CONNECTION_REPOSITORY)
    private readonly connectionRepository: ConnectionRepository,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = client.handshake.auth.token;
      // Validar token y obtener información del usuario
      // ...
      
      // Crear y guardar usuario conectado
      const user = ConnectionUser.create(userId, roles)
        .connect(ConnectionSocketId.create(client.id));
        
      await this.connectionRepository.save(user);
    } catch (error) {
      client.disconnect();
    }
  }
  
  async handleDisconnect(client: Socket): Promise<void> {
    // Lógica de desconexión
    // ...
  }
}
```

## Intención

Permite gestionar funcionalidades de tiempo real de forma desacoplada, clara y escalable, facilitando la integración con otros contextos. El diseño modular facilita:

- La escalabilidad horizontal de conexiones WebSocket.
- El mantenimiento y extensión de la funcionalidad de mensajería.
- La separación clara entre la infraestructura de WebSockets y la lógica de negocio.
- La integración con otros contextos a través de eventos de dominio.
