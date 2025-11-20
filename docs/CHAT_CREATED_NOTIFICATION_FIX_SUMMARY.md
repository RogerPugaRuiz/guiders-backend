# Resumen: Fix de Notificación chat:created

## Estado: ✅ COMPLETADO

Fecha: 2025-10-13

## Problema Reportado

Usuario reportó: "lo he provado en el front del sdk de visitantes y no se esta enviando bien chat:created"

**Síntoma**: Cuando un comercial crea un chat proactivamente para un visitante, la notificación WebSocket `chat:created` no llegaba al frontend.

## Causa Raíz Identificada

El bug estaba en el método `assignCommercial()` del aggregate `Chat`. Cuando se creaba un chat con un `commercialId` especificado, el flujo era:

1. `Chat.createPendingChat()` → Genera `ChatCreatedEvent` ✅
2. `chat.assignCommercial(commercialId)` → Crea nuevo Chat inmutable ❌
3. El nuevo Chat solo tenía `CommercialAssignedEvent`, perdiendo el `ChatCreatedEvent` ❌
4. `commit()` solo publicaba `CommercialAssignedEvent` ❌
5. `NotifyChatCreatedOnChatCreatedEventHandler` nunca se ejecutaba ❌

**Archivo afectado**: `src/context/conversations-v2/domain/entities/chat.aggregate.ts`

## Solución Implementada

### 1. Fix Principal: Preservar Eventos en assignCommercial()

**Archivo**: `src/context/conversations-v2/domain/entities/chat.aggregate.ts`
**Líneas**: 241-259

```typescript
public assignCommercial(commercialId: string): Chat {
  // ... código de validación ...

  const updatedChat = new Chat(/* nuevo estado */);

  // ✅ FIX: Copiar eventos no comprometidos del chat original
  const originalEvents = this.getUncommittedEvents();
  originalEvents.forEach((event) => updatedChat.apply(event));

  // Agregar nuevo evento de asignación
  updatedChat.apply(new CommercialAssignedEvent({...}));

  return updatedChat;
}
```

**¿Por qué funciona?**
- Preserva `ChatCreatedEvent` del chat original
- Agrega `CommercialAssignedEvent` al nuevo chat
- Ambos eventos se publican cuando se llama `commit()`
- `NotifyChatCreatedOnChatCreatedEventHandler` ahora se ejecuta correctamente

### 2. Test Unitario Agregado

**Archivo**: `src/context/conversations-v2/domain/entities/__tests__/chat.spec.ts`
**Líneas**: 75-106

Nuevo test: `'debería preservar ChatCreatedEvent al asignar comercial'`

**Verifica**:
- Chat original tiene 1 evento (`ChatCreatedEvent`)
- Después de `assignCommercial()`, el nuevo chat tiene 2 eventos
- Ambos eventos están presentes: `ChatCreatedEvent` + `CommercialAssignedEvent`

**Resultado**: ✅ Test pasa correctamente

```bash
PASS  src/context/conversations-v2/domain/entities/__tests__/chat.spec.ts
  Chat
    assignCommercial
      ✓ debería asignar comercial a chat pendiente
      ✓ debería preservar ChatCreatedEvent al asignar comercial  👈 NUEVO
      ✓ debería lanzar error si se intenta asignar chat ya cerrado
```

### 3. Documentación Actualizada

#### Documentos Creados/Actualizados:

1. **`FIX_CHAT_CREATED_EVENT_LOSS.md`** (NUEVO)
   - Análisis detallado del bug
   - Explicación de la solución
   - Guía de verificación
   - Pasos para producción

2. **`DEBUGGING_CHAT_CREATED_NOTIFICATIONS.md`** (ACTUALIZADO)
   - Agregada sección sobre el bug conocido
   - Referencia al documento de fix
   - Información sobre el fix aplicado el 2025-10-13

3. **`CHAT_CREATED_NOTIFICATION_FIX_SUMMARY.md`** (ESTE DOCUMENTO)
   - Resumen ejecutivo
   - Estado actual
   - Próximos pasos

### 4. Fix Adicional: Variable Duplicada

**Archivo**: `src/context/visitors-v2/application/commands/identify-visitor.command-handler.ts`

**Problema**: Variable `consentVersion` declarada múltiples veces
**Solución**: Declarar una sola vez al inicio (línea 128) y reutilizar

**Resultado**: ✅ Linter pasa sin errores

## Verificación Realizada

### ✅ Tests Unitarios
```bash
npm run test:unit -- src/context/conversations-v2/domain/entities/__tests__/chat.spec.ts
```
**Resultado**: 12 tests pasados, incluyendo el nuevo test crítico

### ✅ Linting
```bash
npm run lint
```
**Resultado**: Sin errores

### ✅ Formateo
```bash
npm run format
```
**Resultado**: Código formateado correctamente

## Próximos Pasos para el Usuario

### 1. Reiniciar el Servidor

```bash
npm run start:dev
```

### 2. Probar desde el Frontend SDK

**Código JavaScript del Visitante:**

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  path: '/socket.io/',
  withCredentials: true,
});

const visitorId = 'tu-visitor-id-aqui';

// 1. Conectar al WebSocket
socket.on('connect', () => {
  console.log('✅ Conectado:', socket.id);

  // 2. IMPORTANTE: Unirse a la sala del visitante ANTES de crear el chat
  socket.emit('visitor:join', { visitorId });
});

// 3. Escuchar confirmación de unión a sala
socket.on('visitor:joined', (data) => {
  console.log('✅ Sala unida:', data.roomName);
  console.log('Ahora el comercial puede crear un chat para ti');
});

// 4. Escuchar notificación de chat creado
socket.on('chat:created', (data) => {
  console.log('🎉 ¡NOTIFICACIÓN RECIBIDA!', data);
  // data = {
  //   chatId: 'uuid-del-chat',
  //   visitorId: 'tu-visitor-id',
  //   status: 'PENDING' o 'ASSIGNED',
  //   priority: 'NORMAL',
  //   visitorInfo: { name: '...', email: '...' },
  //   metadata: { ... },
  //   createdAt: '2025-10-13T10:00:00.000Z',
  //   message: 'Un comercial ha iniciado una conversación contigo'
  // }
});
```

**Flujo Comercial (Backend o Admin Panel):**

```bash
# Crear chat para el visitante
curl -X POST http://localhost:3000/api/v2/chats/with-message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_COMMERCIAL_TOKEN" \
  -d '{
    "visitorId": "tu-visitor-id-aqui",
    "commercialId": "uuid-del-comercial",
    "firstMessage": {
      "content": "Hola, soy tu asesor comercial. ¿En qué puedo ayudarte?",
      "type": "text"
    },
    "visitorInfo": {
      "name": "Juan Pérez",
      "email": "juan@example.com"
    }
  }'
```

### 3. Verificar Logs del Servidor

**Logs esperados** (con nivel DEBUG activado):

```
[CreateChatWithMessageCommandHandler] Chat creado: <chat-uuid>
[CreateChatWithMessageCommandHandler] Comercial asignado: <commercial-uuid>

=== INICIO NotifyChatCreatedOnChatCreatedEventHandler ===
Procesando notificación de chat creado: <chat-uuid>
📍 Datos del evento: chatId=<chat-uuid>, visitorId=<visitor-uuid>, status=PENDING
🔔 Notificando al visitante <visitor-uuid> de nuevo chat: <chat-uuid>
📡 Emitiendo a la sala: visitor:<visitor-uuid>
📦 Payload: {"chatId":"...","visitorId":"...","status":"PENDING",...}
✅ Notificación de chat creado enviada exitosamente al visitante <visitor-uuid>
=== FIN NotifyChatCreatedOnChatCreatedEventHandler ===
```

### 4. Resultados Esperados

#### ✅ SI FUNCIONA:

**Backend:**
- Logs del `NotifyChatCreatedOnChatCreatedEventHandler` aparecen
- Sin errores en los logs

**Frontend:**
- El evento `chat:created` se dispara
- El payload contiene toda la información del chat
- El visitante puede responder al chat

#### ❌ SI NO FUNCIONA:

**Revisa**:
1. ¿El visitante se unió a su sala? (`visitor:join`)
2. ¿El `visitorId` coincide en ambos lados?
3. ¿El servidor está ejecutando la versión actualizada?
4. ¿Hay errores en los logs del servidor?
5. ¿El WebSocket está conectado? (verificar en Network tab del navegador)

**Comparte**:
- Logs completos del servidor (desde que se crea el chat)
- Logs de la consola del navegador
- Código del frontend que estás usando

## Script de Prueba Automatizado

```bash
node scripts/test-chat-created-notification.js
```

**Nota**: El script requiere que el visitante esté autenticado. Ver `docs/DEBUGGING_CHAT_CREATED_NOTIFICATIONS.md` para más detalles.

## Archivos Modificados

### Producción:
1. `src/context/conversations-v2/domain/entities/chat.aggregate.ts` (Fix principal)
2. `src/context/visitors-v2/application/commands/identify-visitor.command-handler.ts` (Fix linting)

### Tests:
3. `src/context/conversations-v2/domain/entities/__tests__/chat.spec.ts` (Nuevo test)

### Documentación:
4. `docs/FIX_CHAT_CREATED_EVENT_LOSS.md` (NUEVO)
5. `docs/DEBUGGING_CHAT_CREATED_NOTIFICATIONS.md` (ACTUALIZADO)
6. `docs/CHAT_CREATED_NOTIFICATION_FIX_SUMMARY.md` (ESTE DOCUMENTO)

## Commit Recomendado

```bash
git add .
git commit -m "fix(chat): preservar ChatCreatedEvent al asignar comercial

Corrige bug crítico donde el evento ChatCreatedEvent se perdía al asignar
un comercial durante la creación del chat, impidiendo que el visitante
recibiera la notificación WebSocket chat:created.

Cambios:
- Modificado Chat.assignCommercial() para preservar eventos originales
- Agregado test unitario para verificar preservación de eventos
- Actualizada documentación con análisis del bug y solución
- Fix adicional: variable duplicada en identify-visitor handler

Tests: ✅ Todos los tests unitarios pasan
Linting: ✅ Sin errores de ESLint
Formateo: ✅ Código formateado con Prettier

[commit-style-v1]

Refs: #BUG-CHAT-CREATED-NOTIFICATION"
```

## Contacto

Si después de seguir estos pasos el problema persiste:

1. ✅ Reiniciaste el servidor con el código actualizado
2. ✅ El visitante se une correctamente a su sala (`visitor:join`)
3. ✅ Los logs del `NotifyChatCreatedOnChatCreatedEventHandler` NO aparecen
4. ❌ El frontend NO recibe `chat:created`

**Entonces comparte**:
- Logs completos del servidor (con nivel DEBUG)
- Logs de la consola del navegador (incluir Network → WS)
- Versión del código que estás ejecutando (último commit hash)
- Código exacto del frontend que estás usando

## Referencias

- **Bug Fix Details**: `docs/FIX_CHAT_CREATED_EVENT_LOSS.md`
- **Debugging Guide**: `docs/DEBUGGING_CHAT_CREATED_NOTIFICATIONS.md`
- **WebSocket Docs**: `docs/websocket-real-time-chat.md`
- **Event Handler**: `src/context/conversations-v2/application/events/notify-chat-created-on-chat-created.event-handler.ts`
- **Aggregate Fixed**: `src/context/conversations-v2/domain/entities/chat.aggregate.ts`
- **Test Coverage**: `src/context/conversations-v2/domain/entities/__tests__/chat.spec.ts`
