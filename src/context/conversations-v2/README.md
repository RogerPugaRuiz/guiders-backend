# Conversations V2 Context

Este contexto implementa una versión optimizada del sistema de gestión de chats, específicamente diseñada para mejorar el rendimiento en operaciones comerciales y de visitantes.

## Estructura

```text
conversations-v2/
├── application/
│   ├── commands/          # Command handlers (TODO)
│   ├── dtos/              # DTOs para requests/responses
│   ├── events/            # Event handlers (TODO)
│   └── queries/           # Query handlers (TODO)
├── domain/
│   ├── entities/          # Entidades de dominio
│   ├── events/            # Eventos de dominio
│   └── value-objects/     # Value objects
├── infrastructure/
│   ├── controllers/       # Controllers REST
│   ├── mappers/           # Mappers entidad-persistencia
│   ├── persistence/       # Repositorios e implementaciones
│   └── schemas/           # Esquemas MongoDB
└── conversations-v2.module.ts
```

## API Endpoints

### Gestión de Chats

- `POST /api/v2/chats` - Crear nuevo chat para visitante
- `POST /api/v2/chats/with-message` - Crear chat con primer mensaje (NUEVO)
- `GET /api/v2/chats` - Lista de chats con filtros avanzados
- `GET /api/v2/chats/:chatId` - Obtener chat por ID
- `GET /api/v2/chats/commercial/:commercialId` - Chats de un comercial
- `GET /api/v2/chats/visitor/:visitorId` - Chats de un visitante
- `GET /api/v2/chats/queue/pending` - Cola de chats pendientes
- `PUT /api/v2/chats/:chatId/assign/:commercialId` - Asignar chat
- `PUT /api/v2/chats/:chatId/close` - Cerrar chat
- `DELETE /api/v2/chats/visitor/:visitorId/clear` - Limpiar chats de visitante

### Gestión de Mensajes

- `POST /api/v2/messages` - Enviar nuevo mensaje
- `GET /api/v2/messages/chat/:chatId` - Obtener mensajes de un chat
- `GET /api/v2/messages/:messageId` - Obtener mensaje por ID
- `PUT /api/v2/messages/mark-as-read` - Marcar mensajes como leídos
- `GET /api/v2/messages/chat/:chatId/unread` - Obtener mensajes no leídos
- `GET /api/v2/messages/search` - Buscar mensajes
- `GET /api/v2/messages/chat/:chatId/stats` - Estadísticas de mensajes
- `GET /api/v2/messages/metrics` - Métricas de mensajes
- `GET /api/v2/messages/attachments` - Obtener archivos adjuntos

### Métricas y Estadísticas

- `GET /api/v2/chats/metrics/commercial/:commercialId` - Métricas de comercial
- `GET /api/v2/chats/stats/response-time` - Estadísticas de tiempo de respuesta

## Características Principales

### Optimizaciones MongoDB

- **Índices compuestos** para consultas frecuentes
- **Campos derivados** para evitar joins
- **Esquemas desnormalizados** para mejor rendimiento
- **Agregaciones optimizadas** para métricas

### Filtros Avanzados

- Estado del chat (PENDING, ASSIGNED, ACTIVE, CLOSED, etc.)
- Prioridad (LOW, MEDIUM, NORMAL, HIGH, URGENT)
- Rango de fechas
- Departamento
- Comercial asignado
- Mensajes no leídos

### Métricas Comerciales

- Total de chats asignados
- Chats activos/cerrados
- Tiempo promedio de respuesta
- Duración promedio de chat
- Tasa de resolución
- Estadísticas por período

## Estado de Implementación

### ✅ Completado

- Esquema MongoDB optimizado para chats y mensajes
- DTOs para requests/responses de chats y mensajes
- Controllers completos (ChatV2Controller, MessageV2Controller)
- Command handlers implementados (CreateChatWithMessage, JoinWaitingRoom, ClearVisitorChats)
- Query handlers implementados (GetChatsWithFilters, GetChatById)
- Repositorios MongoDB (MongoChatRepositoryImpl, MongoMessageRepositoryImpl)
- Mappers dominio-persistencia (ChatMapper, MessageMapper)
- Módulo completamente configurado con providers
- Tests unitarios y E2E para endpoints principales
- Documentación Swagger completa
- **Event handler para notificaciones de chat creado** (NotifyChatCreatedOnChatCreatedEventHandler)
- **Salas de visitantes en WebSocket** para notificaciones proactivas
- **Tests unitarios para event handlers** de notificaciones

### 🚧 En Progreso

- Optimización de índices MongoDB basada en uso real
- Tests de integración adicionales para WebSocket

### ⏳ Pendiente

- Métricas avanzadas de rendimiento
- Soporte para archivos adjuntos en mensajes

## Uso

### Importar el módulo

```typescript
import { ConversationsV2Module } from './context/conversations-v2/conversations-v2.module';

@Module({
  imports: [
    ConversationsV2Module,
    // otros módulos...
  ],
})
export class AppModule {}
```

### Filtros de ejemplo

```typescript
// Obtener chats pendientes de alta prioridad
GET /api/v2/chats?filters[status][]=PENDING&filters[priority][]=HIGH,URGENT

// Chats de un comercial con paginación
GET /api/v2/chats/commercial/123?page=1&limit=20

// Métricas del último mes
GET /api/v2/chats/metrics/commercial/123?dateFrom=2025-07-01&dateTo=2025-07-31

// Crear chat con primer mensaje (NUEVO)
POST /api/v2/chats/with-message
{
  "firstMessage": {
    "content": "Hola, necesito ayuda con un producto",
    "type": "text"
  },
  "visitorInfo": {
    "name": "Juan Pérez",
    "email": "juan@example.com"
  },
  "metadata": {
    "department": "ventas",
    "source": "website"
  }
}
```

## Notificaciones Proactivas en Tiempo Real (NUEVO)

### Sistema de Salas de Visitantes

El sistema ahora soporta **notificaciones proactivas** cuando un comercial crea un chat para un visitante:

#### Flujo de Notificación

```
1. Visitante se conecta al WebSocket y se une a su sala personal:
   → socket.emit('visitor:join', { visitorId })

2. Comercial crea un chat para el visitante:
   → POST /v2/chats/with-message

3. Se dispara el evento ChatCreatedEvent

4. NotifyChatCreatedOnChatCreatedEventHandler emite notificación:
   → socket.to(`visitor:${visitorId}`).emit('chat:created', chatData)

5. Visitante recibe notificación instantánea:
   → socket.on('chat:created', (data) => { ... })
```

#### Event Handler Implementado

- **NotifyChatCreatedOnChatCreatedEventHandler**
  - Ubicación: `src/context/conversations-v2/application/events/`
  - Escucha: `ChatCreatedEvent`
  - Acción: Emite `chat:created` a la sala `visitor:{visitorId}`
  - Tests: 6 tests unitarios completos

#### Eventos WebSocket Disponibles

| Evento | Dirección | Payload | Descripción |
|--------|-----------|---------|-------------|
| `visitor:join` | Cliente → Servidor | `{ visitorId }` | Unirse a sala de visitante |
| `visitor:leave` | Cliente → Servidor | `{ visitorId }` | Salir de sala de visitante |
| `visitor:joined` | Servidor → Cliente | `{ visitorId, roomName, timestamp }` | Confirmación de unión |
| `visitor:left` | Servidor → Cliente | `{ visitorId, roomName, timestamp }` | Confirmación de salida |
| `chat:created` | Servidor → Cliente | `{ chatId, visitorId, status, priority, visitorInfo, metadata, createdAt, message }` | Notificación de chat creado |

### Documentación Completa

Para guías completas de implementación frontend:
- `docs/websocket-real-time-chat.md` - Guía completa con ejemplos avanzados
- `docs/websocket-implementation-summary.md` - Resumen ejecutivo y quick start

## Próximos Pasos

1. **Implementar métricas avanzadas** - Dashboard comercial con métricas detalladas
2. **Añadir soporte para archivos adjuntos** - Upload y gestión de archivos en mensajes
3. **Tests de carga** - Para validar rendimiento con alto volumen de mensajes
4. **Optimizar índices MongoDB** - Basado en patrones de uso en producción
5. **Notificaciones push móviles** - Integración con FCM/APNS

## Características Destacadas (NUEVAS)

### Endpoint de Chat con Mensaje Atómico

El nuevo endpoint `POST /api/v2/chats/with-message` permite crear un chat y enviar el primer mensaje en una sola operación atómica, mejorando la experiencia del usuario visitante:

- **Transacción atómica**: Chat y mensaje se crean juntos o fallan juntos
- **Validación completa**: DTO con validación de campos requeridos
- **Posición en cola**: Retorna automáticamente la posición del visitante
- **Autenticación flexible**: Soporta tanto JWT como sesión de visitante

### Architecture CQRS Implementada

- **Commands**: CreateChatWithMessageCommand, JoinWaitingRoomCommand, ClearVisitorChatsCommand
- **Queries**: GetChatsWithFiltersQuery, GetChatByIdQuery  
- **Handlers**: Implementación completa con manejo de errores y logging
- **Events**: Preparado para eventos de dominio (ChatCreated, MessageSent)

## Diferencias con Conversations V1

- **MongoDB vs TypeORM**: Mejor rendimiento para consultas complejas
- **Desnormalización**: Menos joins, consultas más rápidas
- **Índices optimizados**: Para patrones específicos comercial-visitante
- **Métricas integradas**: Cálculos en tiempo real
- **API REST mejorada**: Filtros más granulares y paginación eficiente
