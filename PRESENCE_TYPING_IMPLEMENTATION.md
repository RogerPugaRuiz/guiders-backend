# Sistema de Presencia y Typing Indicators - Documentación de Implementación

## Resumen

Se ha implementado un sistema completo de presencia y indicadores de escritura en tiempo real para comerciales y visitantes. La implementación incluye:

1. ✅ Estados de presencia con detección automática de inactividad
2. ✅ Indicadores de "escribiendo" (typing indicators) con TTL de 3 segundos
3. ✅ Notificaciones WebSocket en tiempo real
4. ✅ Arquitectura DDD/CQRS completa

## Componentes Implementados

### 1. Dominio (Domain Layer)

#### Value Objects
- **CommercialConnectionStatus** (`src/context/commercial/domain/value-objects/commercial-connection-status.ts`)
  - Estados: `online`, `offline`, `busy`, `away` ✅
  - Métodos: `isOnline()`, `isBusy()`, `isAway()`, `isAvailable()`

- **VisitorConnectionVO** (`src/context/visitors-v2/domain/value-objects/visitor-connection.ts`)
  - Estados: `online`, `offline`, `chatting`, `away` ✅
  - Métodos de transición: `goAway()`, `returnFromAway()`

- **TypingStatus** (`src/context/shared/domain/value-objects/typing-status.ts`)
  - Gestiona estado de escritura con timestamp ✅
  - Métodos: `typing()`, `notTyping()`, `isExpired()`

#### Domain Services (Interfaces)
- **CommercialConnectionDomainService** ✅
  - Nuevos métodos: `setTyping()`, `isTyping()`, `clearTyping()`, `getTypingInChat()`

- **VisitorConnectionDomainService** ✅
  - Nuevos métodos: `setTyping()`, `isTyping()`, `clearTyping()`, `getTypingInChat()`

### 2. Infraestructura (Infrastructure Layer)

#### Implementaciones Redis
- **RedisCommercialConnectionDomainService** ✅
  - Implementación completa de typing indicators con TTL 3s
  - Soporte para estado `away`
  - Keys: `commercial:typing:{commercialId}:{chatId}`

- **RedisVisitorConnectionDomainService** ✅
  - Implementación completa de typing indicators con TTL 3s
  - Soporte para estado `away`
  - Keys: `visitor:typing:{visitorId}:{chatId}`

#### Scheduler
- **PresenceInactivityScheduler** (`src/context/shared/infrastructure/schedulers/presence-inactivity.scheduler.ts`) ✅
  - Ejecuta cada 1 minuto
  - Detecta inactividad >5 minutos
  - Cambia automáticamente usuarios a estado `away`
  - Variables de entorno:
    - `PRESENCE_INACTIVITY_ENABLED`: true/false (default: true)
    - `PRESENCE_INACTIVITY_MINUTES`: número de minutos (default: 5)

### 3. Application Layer

#### Commands
- **StartTypingCommand** + Handler ✅
  - Marca usuario como "escribiendo" en chat específico
  - Emite evento `TypingStartedEvent`

- **StopTypingCommand** + Handler ✅
  - Limpia estado de "escribiendo"
  - Emite evento `TypingStoppedEvent`

#### Domain Events
- **TypingStartedEvent** ✅
- **TypingStoppedEvent** ✅
- **PresenceChangedEvent** ✅

#### Event Handlers
- **NotifyTypingStartedOnTypingStartedEventHandler** ✅
  - Emite `typing:start` vía WebSocket a sala del chat

- **NotifyTypingStoppedOnTypingStoppedEventHandler** ✅
  - Emite `typing:stop` vía WebSocket a sala del chat

- **NotifyPresenceChangedOnPresenceChangedEventHandler** ✅
  - Emite `presence:changed` vía WebSocket
  - Notifica a sala del usuario y sala del tenant

#### DTOs
- **TypingStatusDto** ✅
- **ParticipantPresenceDto** ✅
- **ChatPresenceDto** ✅

### 4. WebSocket Gateway

**WebSocketGatewayBasic** (`src/websocket/websocket.gateway.ts`) ✅

Nuevos listeners:
- `@SubscribeMessage('typing:start')` - Cliente inicia typing
- `@SubscribeMessage('typing:stop')` - Cliente detiene typing

Eventos emitidos:
- `typing:start` - Notifica que usuario está escribiendo
- `typing:stop` - Notifica que usuario dejó de escribir
- `presence:changed` - Notifica cambio de estado de presencia

## Flujo de Uso

### Typing Indicators

**Flujo Cliente → Servidor → Broadcast:**

1. **Cliente empieza a escribir:**
   ```javascript
   socket.emit('typing:start', {
     chatId: 'chat-uuid',
     userId: 'user-uuid',
     userType: 'commercial' // or 'visitor'
   });
   ```

2. **Servidor procesa y broadcast:**
   - WebSocket Gateway recibe evento
   - Emite a sala del chat (excepto remitente)
   - TTL de 3 segundos en Redis

3. **Otros participantes reciben:**
   ```javascript
   socket.on('typing:start', (data) => {
     // data: { chatId, userId, userType, timestamp }
     // Mostrar indicador en UI
   });
   ```

4. **Cliente deja de escribir:**
   ```javascript
   socket.emit('typing:stop', {
     chatId: 'chat-uuid',
     userId: 'user-uuid',
     userType: 'commercial'
   });
   ```

**Auto-expiración:** Si el cliente no envía `typing:stop`, el estado expira automáticamente en 3 segundos.

### Presencia y Estado Away

1. **Scheduler ejecuta cada 1 minuto**
2. **Verifica última actividad de usuarios online**
3. **Si >5 minutos sin actividad:**
   - Cambia estado a `away`
   - Emite evento `PresenceChangedEvent`
   - WebSocket notifica a clientes

4. **Cliente recibe actualización:**
   ```javascript
   socket.on('presence:changed', (data) => {
     // data: { userId, userType, status, previousStatus, timestamp }
     // Actualizar UI de lista de chats
   });
   ```

## Configuración Requerida

### 1. Registrar Scheduler en AppModule

Añadir en `src/app.module.ts`:

```typescript
import { ScheduleModule } from '@nestjs/schedule';
import { PresenceInactivityScheduler } from './context/shared/infrastructure/schedulers/presence-inactivity.scheduler';
import { NotifyPresenceChangedOnPresenceChangedEventHandler } from './context/shared/infrastructure/events/notify-presence-changed-on-presence-changed.event-handler';

@Module({
  imports: [
    ScheduleModule.forRoot(), // Si no está ya incluido
    // ... otros imports
  ],
  providers: [
    PresenceInactivityScheduler,
    NotifyPresenceChangedOnPresenceChangedEventHandler,
    // ... otros providers
  ],
})
export class AppModule {}
```

### 2. Variables de Entorno

Añadir a `.env`:

```bash
# Presence & Typing Configuration
PRESENCE_INACTIVITY_ENABLED=true
PRESENCE_INACTIVITY_MINUTES=5
REDIS_URL=redis://localhost:6379
```

### 3. Actualizar Módulos

✅ **ConversationsV2Module** - Ya registrado:
- StartTypingCommandHandler
- StopTypingCommandHandler
- NotifyTypingStartedOnTypingStartedEventHandler
- NotifyTypingStoppedOnTypingStoppedEventHandler

## Tareas Pendientes

### Alta Prioridad

1. **Registrar PresenceInactivityScheduler en AppModule** ⚠️
   - Archivo: `src/app.module.ts`
   - Añadir import y provider

2. **Crear endpoints REST** (opcional, WebSocket es suficiente)
   - `GET /chats/:chatId/presence` - Obtener presencia de participantes
   - `POST /activity/heartbeat` - Actualizar última actividad manual

3. **Implementar método lastActivity para visitantes**
   - Actualmente solo comerciales tienen tracking de última actividad
   - Añadir a `VisitorConnectionDomainService` si se necesita

### Media Prioridad

4. **Crear Query Handlers** (si se necesitan endpoints REST)
   - `GetChatParticipantsPresenceQuery`
   - `GetTypingStatusInChatQuery`

5. **Testing**
   - Unit tests para value objects y handlers
   - Integration tests para Redis typing storage
   - E2E tests para flujo completo WebSocket

### Baja Prioridad

6. **Optimizaciones**
   - Usar Redis Pub/Sub en lugar de `keys()` para `getTypingInChat()`
   - Cache de presencia con invalidación reactiva
   - Métricas de uso de typing indicators

7. **Documentación Frontend**
   - Guía de integración para cliente React/Vue
   - Ejemplos de manejo de estados de presencia
   - Best practices para debouncing de typing events

## Ejemplo de Integración Frontend

```typescript
// React Hook Example
function useChatPresence(chatId: string) {
  const [participants, setParticipants] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const socket = useSocket();

  useEffect(() => {
    // Unirse a sala del chat
    socket.emit('chat:join', { chatId });

    // Escuchar typing indicators
    socket.on('typing:start', ({ userId, userType }) => {
      setTypingUsers(prev => [...prev, { userId, userType }]);
    });

    socket.on('typing:stop', ({ userId }) => {
      setTypingUsers(prev => prev.filter(u => u.userId !== userId));
    });

    // Escuchar cambios de presencia
    socket.on('presence:changed', ({ userId, status }) => {
      setParticipants(prev =>
        prev.map(p => p.userId === userId ? { ...p, status } : p)
      );
    });

    return () => {
      socket.emit('chat:leave', { chatId });
      socket.off('typing:start');
      socket.off('typing:stop');
      socket.off('presence:changed');
    };
  }, [chatId]);

  // Funciones para emitir typing
  const startTyping = useCallback(() => {
    socket.emit('typing:start', {
      chatId,
      userId: currentUser.id,
      userType: currentUser.type
    });
  }, [chatId]);

  const stopTyping = useCallback(() => {
    socket.emit('typing:stop', {
      chatId,
      userId: currentUser.id,
      userType: currentUser.type
    });
  }, [chatId]);

  return { participants, typingUsers, startTyping, stopTyping };
}
```

## Pruebas Manuales

### 1. Verificar Typing Indicators

```bash
# Conectar dos clientes WebSocket al mismo chat
# Cliente 1:
socket.emit('chat:join', { chatId: 'test-chat-id' });
socket.emit('typing:start', { chatId: 'test-chat-id', userId: 'user-1', userType: 'visitor' });

# Cliente 2 debería recibir:
socket.on('typing:start', (data) => console.log(data));
// Output: { chatId: 'test-chat-id', userId: 'user-1', userType: 'visitor', timestamp: '...' }

# Esperar 3 segundos y verificar que expira automáticamente
```

### 2. Verificar Estado Away

```bash
# Conectar comercial
# Esperar 5+ minutos sin actividad
# Verificar en Redis:
redis-cli GET commercial:status:{commercialId}
# Debería mostrar: "away"

# Verificar que se emitió evento presence:changed
```

### 3. Verificar Redis Keys

```bash
# Typing indicators
redis-cli KEYS commercial:typing:*
redis-cli KEYS visitor:typing:*
redis-cli TTL commercial:typing:{commercialId}:{chatId}
# Debería ser ≤ 3 segundos

# Presencia
redis-cli GET commercial:status:{commercialId}
redis-cli GET visitor:conn:{visitorId}
```

## Solución de Problemas

### Typing indicators no expiran

**Problema:** Estado de typing permanece activo >3 segundos

**Solución:**
1. Verificar que Redis está corriendo
2. Verificar TTL en Redis: `redis-cli TTL commercial:typing:{id}:{chatId}`
3. Verificar logs del servicio de conexión

### Scheduler no ejecuta

**Problema:** Usuarios no cambian a estado away

**Solución:**
1. Verificar que `PresenceInactivityScheduler` está registrado en AppModule
2. Verificar variable de entorno: `PRESENCE_INACTIVITY_ENABLED=true`
3. Verificar logs del scheduler (buscar "🔍 Iniciando verificación de inactividad")

### Eventos WebSocket no se reciben

**Problema:** Cliente no recibe eventos de typing/presence

**Solución:**
1. Verificar que cliente se unió a sala del chat: `socket.emit('chat:join', { chatId })`
2. Verificar que event handlers están registrados en ConversationsV2Module
3. Verificar logs del WebSocketGateway

## Referencias

- **CLAUDE.md** - Guía completa de arquitectura del proyecto
- **WebSocket Documentation** - Eventos y salas disponibles
- **Redis Keys Pattern** - Estructura de keys para presencia y typing

## Changelog

**2025-01-XX** - Implementación inicial
- ✅ Estados de presencia con `away` automático
- ✅ Typing indicators con TTL 3s
- ✅ WebSocket listeners y eventos
- ✅ Scheduler de inactividad
- ✅ Event handlers para notificaciones
- ✅ DTOs y value objects completos

---

**Implementado por:** Claude Code
**Fecha:** 2025-01-18
**Versión:** 1.0.0
