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

### 🚧 En Progreso

- Event handlers para comunicación entre contextos
- Optimización de índices MongoDB basada en uso real
- Tests de integración adicionales

### ⏳ Pendiente

- Integración completa con sistema de notificaciones WebSocket
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

## Próximos Pasos

1. **Optimizar Event handlers** - Para notificaciones en tiempo real vía WebSocket
2. **Implementar métricas avanzadas** - Dashboard comercial con métricas detalladas  
3. **Añadir soporte para archivos adjuntos** - Upload y gestión de archivos en mensajes
4. **Tests de carga** - Para validar rendimiento con alto volumen de mensajes
5. **Optimizar índices MongoDB** - Basado en patrones de uso en producción

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
