# Arquitectura Hexagonal - Guía de Reglas

## Visión General

Arquitectura DDD + CQRS con NestJS v11, multi-persistencia (PostgreSQL + MongoDB) y WebSocket.

## Estructura de Capas

```
src/context/<context>/
├── domain/          # Lógica de negocio pura
├── application/     # Casos de uso (Commands, Queries, Events)
└── infrastructure/  # Adaptadores externos (Controllers, Repos, Gateways)
```

## Regla de Dependencias

```
domain ⇏ nada
application → domain
infrastructure → application + domain
```

## Navegación

### [Shared](./shared/)
- [Result Pattern](./shared/result.md) - Manejo de errores sin excepciones
- [Optional](./shared/optional.md) - Valores nullable seguros
- [Criteria](./shared/criteria.md) - Queries flexibles
- [Uuid](./shared/uuid.md) - Value Object base para IDs

### [Domain](./domain/)
- [Entities](./domain/entities.md) - Aggregates y AggregateRoot
- [Value Objects](./domain/value-objects.md) - Objetos inmutables
- [Repositories](./domain/repositories.md) - Interfaces de persistencia
- [Events](./domain/events.md) - Eventos de dominio
- [Errors](./domain/errors.md) - Errores de dominio
- [Services](./domain/services.md) - Servicios de dominio

### [Application](./application/)
- [Commands](./application/commands.md) - Operaciones de escritura
- [Queries](./application/queries.md) - Operaciones de lectura
- [Events](./application/events.md) - Handlers de eventos
- [DTOs](./application/dtos.md) - Data Transfer Objects

### [Infrastructure](./infrastructure/)
- [Controllers](./infrastructure/controllers.md) - Endpoints REST
- [Repositories](./infrastructure/repositories.md) - Implementaciones
- [Schemas](./infrastructure/schemas.md) - MongoDB Schemas
- [Entities](./infrastructure/entities.md) - TypeORM Entities
- [Services](./infrastructure/services.md) - Adaptadores externos
- [Gateways](./infrastructure/gateways.md) - WebSocket

## Principios Fundamentales

1. **Result Pattern** - No lanzar excepciones para flujos esperados
2. **Event Publishing** - Siempre `mergeObjectContext()` + `commit()`
3. **Inmutabilidad** - Value Objects y Aggregates inmutables
4. **Mappers** - Nunca exponer entities/schemas fuera de infrastructure
