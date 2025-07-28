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

- `GET /api/v2/chats` - Lista de chats con filtros avanzados
- `GET /api/v2/chats/:chatId` - Obtener chat por ID
- `GET /api/v2/chats/commercial/:commercialId` - Chats de un comercial
- `GET /api/v2/chats/visitor/:visitorId` - Chats de un visitante
- `GET /api/v2/chats/queue/pending` - Cola de chats pendientes
- `PUT /api/v2/chats/:chatId/assign/:commercialId` - Asignar chat
- `PUT /api/v2/chats/:chatId/close` - Cerrar chat

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

- Esquema MongoDB optimizado
- DTOs para requests/responses
- Controller con todos los endpoints
- Módulo básico de NestJS
- Tests del esquema MongoDB

### 🚧 En Progreso

- Command/Query handlers
- Implementación del repositorio MongoDB
- Services de dominio

### ⏳ Pendiente

- Event handlers
- Integración con el contexto existente
- Tests de integración
- Documentación Swagger completa

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
```

## Próximos Pasos

1. **Implementar Command/Query handlers** - Para la lógica de negocio
2. **Crear repositorio MongoDB** - Para la persistencia de datos
3. **Añadir event handling** - Para la comunicación entre contextos
4. **Tests de integración** - Para validar el funcionamiento completo
5. **Optimizar índices** - Basado en patrones de uso reales

## Diferencias con Conversations V1

- **MongoDB vs TypeORM**: Mejor rendimiento para consultas complejas
- **Desnormalización**: Menos joins, consultas más rápidas
- **Índices optimizados**: Para patrones específicos comercial-visitante
- **Métricas integradas**: Cálculos en tiempo real
- **API REST mejorada**: Filtros más granulares y paginación eficiente
