# Debugging: Notificaciones de Chat Creado

Esta guía te ayudará a diagnosticar problemas con las notificaciones WebSocket del evento `chat:created`.

## Problema

El visitante no recibe la notificación `chat:created` cuando un comercial crea un chat proactivamente.

## Diagnóstico Paso a Paso

### 1. Verificar que el servidor esté corriendo

```bash
npm run start:dev
```

Deberías ver logs indicando que el servidor está corriendo en el puerto 3000.

### 2. Ejecutar el script de prueba

Usa el script de testing incluido para verificar el flujo completo:

```bash
node scripts/test-chat-created-notification.js
```

**Resultado Esperado:**

```
=== Test de Notificación de Chat Creado ===

API URL: http://localhost:3000
Visitor ID: test-visitor-1234567890

1️⃣  Conectando al WebSocket...
✅ WebSocket conectado: abc123xyz

2️⃣  Uniéndose a la sala del visitante...
Respuesta de visitor:join: { success: true, ... }
✅ Sala de visitante unida: { visitorId: 'test-visitor-1234567890', roomName: 'visitor:test-visitor-1234567890', timestamp: ... }

3️⃣  Creando chat con mensaje...
✅ Chat creado exitosamente:
   Chat ID: chat-uuid-here
   Message ID: message-uuid-here
   Position: 1

4️⃣  Esperando notificación WebSocket...

🎉 ¡NOTIFICACIÓN RECIBIDA! chat:created
Datos del chat: {
  "chatId": "chat-uuid-here",
  "visitorId": "test-visitor-1234567890",
  "status": "PENDING",
  "priority": "NORMAL",
  ...
}

✅ TEST EXITOSO: La notificación fue recibida correctamente
```

### 3. Revisar logs del servidor

Busca estos logs en el servidor (con nivel DEBUG activado):

```
=== INICIO NotifyChatCreatedOnChatCreatedEventHandler ===
Procesando notificación de chat creado: chat-uuid-here
📍 Datos del evento: chatId=chat-uuid-here, visitorId=test-visitor-1234567890, status=PENDING
🔔 Notificando al visitante test-visitor-1234567890 de nuevo chat: chat-uuid-here
📡 Emitiendo a la sala: visitor:test-visitor-1234567890
📦 Payload: {"chatId":"...","visitorId":"...","status":"PENDING",...}
✅ Notificación de chat creado enviada exitosamente al visitante test-visitor-1234567890
=== FIN NotifyChatCreatedOnChatCreatedEventHandler ===
```

### 4. Verificar el WebSocket Gateway

Busca logs del WebSocket Gateway:

```
Emitiendo evento "chat:created" a sala: visitor:test-visitor-1234567890
```

## Problemas Comunes

### ❌ El event handler no se ejecuta

**Síntoma:** No aparecen los logs del NotifyChatCreatedOnChatCreatedEventHandler

**Causas posibles:**

1. **El evento ChatCreatedEvent no se está emitiendo**
   - Verificar que `Chat.create()` o `Chat.createPendingChat()` se llama correctamente
   - Verificar que `chatAggregate.commit()` se llama en el command handler

2. **El event handler no está registrado**
   - Verificar que `NotifyChatCreatedOnChatCreatedEventHandler` está en providers del módulo
   - Verificar que el decorador `@EventsHandler(ChatCreatedEvent)` está presente

3. **El evento ChatCreatedEvent se pierde al asignar comercial** ⚠️ BUG CONOCIDO (FIXED)
   - Cuando un comercial crea un chat, si `assignCommercial()` se llama antes de `commit()`, el evento puede perderse
   - **Este bug fue corregido el 2025-10-13**
   - Ver documentación completa: [`docs/FIX_CHAT_CREATED_EVENT_LOSS.md`](./FIX_CHAT_CREATED_EVENT_LOSS.md)
   - Si experimentas este problema después del fix, verifica que estás usando la versión más reciente del código

**Solución:**

```typescript
// En create-chat-with-message.command-handler.ts, línea 141
chatAggregate.commit(); // CRÍTICO: Sin esto, los eventos no se publican
```

**Fix Aplicado (2025-10-13):**

El método `assignCommercial()` ahora preserva correctamente el `ChatCreatedEvent`:

```typescript
// En chat.aggregate.ts, líneas 241-244
const originalEvents = this.getUncommittedEvents();
originalEvents.forEach((event) => updatedChat.apply(event));
```

Ver detalles completos del bug y la solución en: [`FIX_CHAT_CREATED_EVENT_LOSS.md`](./FIX_CHAT_CREATED_EVENT_LOSS.md)

### ❌ El visitante no recibe la notificación

**Síntoma:** El event handler se ejecuta correctamente pero el frontend no recibe `chat:created`

**Causas posibles:**

1. **El visitante no se unió a su sala**
   - El visitante debe ejecutar `socket.emit('visitor:join', { visitorId })` ANTES de que se cree el chat
   - Verificar logs: `Cliente {socketId} se unió a la sala de visitante: visitor:{visitorId}`

2. **El visitorId no coincide**
   - El visitorId usado para unirse a la sala debe ser el mismo que el del chat creado
   - Verificar en logs: `visitor:{visitorId}` debe coincidir

3. **El WebSocket no está conectado**
   - Verificar que el socket está en estado `connected`
   - Verificar que no hay errores de CORS

**Solución Frontend:**

```javascript
// 1. PRIMERO: Unirse a la sala del visitante
socket.emit('visitor:join', { visitorId: 'visitor-123' });

// 2. LUEGO: Escuchar notificaciones
socket.on('chat:created', (data) => {
  console.log('Nuevo chat creado:', data);
});

// 3. FINALMENTE: El comercial crea el chat
// POST /v2/chats/with-message con visitorId: 'visitor-123'
```

### ❌ Error: "Cannot read property 'emitToRoom' of undefined"

**Síntoma:** Error en el event handler al intentar llamar a `websocketGateway.emitToRoom`

**Causa:** El WebSocketGatewayBasic no se está inyectando correctamente

**Solución:**

Verificar que el módulo ConversationsV2Module tiene:

```typescript
import { WebSocketModule } from 'src/websocket/websocket.module';
import { WebSocketGatewayBasic } from 'src/websocket/websocket.gateway';

@Module({
  imports: [
    WebSocketModule, // Importar el módulo
    // ...
  ],
  providers: [
    {
      provide: 'WEBSOCKET_GATEWAY',
      useExisting: WebSocketGatewayBasic, // Usar el gateway existente
    },
    NotifyChatCreatedOnChatCreatedEventHandler,
    // ...
  ],
})
```

### ❌ El companyId es 'TODO'

**Síntoma:** En el payload del evento, `companyId` tiene el valor `'TODO'`

**Impacto:** Esto NO debería afectar la notificación, pero es un código técnico pendiente

**Solución temporal:** No afecta la funcionalidad de la notificación WebSocket

**Solución futura:** Obtener el companyId del contexto en `Chat.create()`:

```typescript
// TODO: Obtener companyId del contexto
companyId: context.getCompanyId() || 'unknown',
```

## Checklist de Verificación

Antes de reportar un issue, verifica:

- [ ] El servidor está corriendo y escuchando en el puerto correcto
- [ ] El script de prueba pasa exitosamente
- [ ] Los logs del event handler aparecen en el servidor
- [ ] Los logs del WebSocket Gateway aparecen
- [ ] El visitante se une correctamente a su sala (`visitor:join`)
- [ ] El `visitorId` coincide entre el join y el chat creado
- [ ] El socket del visitante está conectado
- [ ] No hay errores de CORS en el navegador

## Testing Manual (Frontend)

### Paso 1: Conectar y unirse a sala

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  path: '/socket.io/',
  withCredentials: true,
});

const visitorId = 'visitor-123'; // Usar un ID real o de prueba

socket.on('connect', () => {
  console.log('✅ Conectado:', socket.id);

  // CRÍTICO: Unirse a la sala del visitante
  socket.emit('visitor:join', { visitorId });
});

socket.on('visitor:joined', (data) => {
  console.log('✅ Sala unida:', data.roomName);
});

socket.on('chat:created', (data) => {
  console.log('🎉 ¡NOTIFICACIÓN RECIBIDA!', data);
  // Aquí manejar la notificación (mostrar alerta, redirigir, etc.)
});
```

### Paso 2: Crear el chat (vía HTTP o desde otro cliente)

```bash
curl -X POST http://localhost:3000/v2/chats/with-message \
  -H "Content-Type: application/json" \
  -d '{
    "visitorId": "visitor-123",
    "firstMessage": {
      "content": "Hola, necesito ayuda",
      "type": "text"
    },
    "visitorInfo": {
      "name": "Juan Pérez",
      "email": "juan@example.com"
    }
  }'
```

### Paso 3: Verificar notificación

La consola del navegador debería mostrar:

```
🎉 ¡NOTIFICACIÓN RECIBIDA! {
  chatId: 'chat-uuid-here',
  visitorId: 'visitor-123',
  status: 'PENDING',
  priority: 'NORMAL',
  visitorInfo: { name: 'Juan Pérez', email: 'juan@example.com' },
  metadata: undefined,
  createdAt: '2025-10-13T10:00:00.000Z',
  message: 'Un comercial ha iniciado una conversación contigo'
}
```

## Logs Útiles

### Habilitar logs DEBUG

En el archivo `.env` o variables de entorno:

```
LOG_LEVEL=debug
```

O en el código:

```typescript
// src/main.ts
app.useLogger(['error', 'warn', 'log', 'debug', 'verbose']);
```

### Logs clave a buscar

1. **Event Handler:**
   ```
   === INICIO NotifyChatCreatedOnChatCreatedEventHandler ===
   ```

2. **WebSocket Gateway:**
   ```
   Emitiendo evento "chat:created" a sala: visitor:{visitorId}
   ```

3. **Command Handler:**
   ```
   Chat creado exitosamente: {chatId}
   ```

4. **Visitor Join:**
   ```
   Cliente {socketId} se unió a la sala de visitante: visitor:{visitorId}
   ```

## Soporte

Si después de seguir estos pasos el problema persiste:

1. Captura los logs del servidor
2. Captura los logs del navegador (consola + Network tab → WS)
3. Describe exactamente qué está pasando y qué esperabas que pasara
4. Comparte el código del frontend que estás usando

## Referencias

- Documentación completa: `docs/websocket-real-time-chat.md`
- Script de prueba: `scripts/test-chat-created-notification.js`
- Event Handler: `src/context/conversations-v2/application/events/notify-chat-created-on-chat-created.event-handler.ts`
- WebSocket Gateway: `src/websocket/websocket.gateway.ts`
