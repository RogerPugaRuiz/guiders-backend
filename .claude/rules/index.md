# Hexagonal Architecture - Rules Guide

## Overview

DDD + CQRS architecture with NestJS v11, multi-persistence (PostgreSQL + MongoDB) and WebSocket.

## Layer Structure

```
src/context/<context>/
├── domain/          # Pure business logic
├── application/     # Use cases (Commands, Queries, Events)
└── infrastructure/  # External adapters (Controllers, Repos, Gateways)
```

## Dependency Rule

```
domain ⇏ nothing
application → domain
infrastructure → application + domain
```

## Navigation

### [Shared](./shared/)
- [Result Pattern](./shared/result.md) - Error handling without exceptions
- [Optional](./shared/optional.md) - Safe nullable values
- [Criteria](./shared/criteria.md) - Flexible queries
- [Uuid](./shared/uuid.md) - Base Value Object for IDs

### [Domain](./domain/)
- [Entities](./domain/entities.md) - Aggregates and AggregateRoot
- [Value Objects](./domain/value-objects.md) - Immutable objects
- [Repositories](./domain/repositories.md) - Persistence interfaces
- [Events](./domain/events.md) - Domain events
- [Errors](./domain/errors.md) - Domain errors
- [Services](./domain/services.md) - Domain services

### [Application](./application/)
- [Commands](./application/commands.md) - Write operations
- [Queries](./application/queries.md) - Read operations
- [Events](./application/events.md) - Event handlers
- [DTOs](./application/dtos.md) - Data Transfer Objects

### [Infrastructure](./infrastructure/)
- [Controllers](./infrastructure/controllers.md) - REST endpoints
- [Repositories](./infrastructure/repositories.md) - Implementations
- [Schemas](./infrastructure/schemas.md) - MongoDB Schemas
- [Entities](./infrastructure/entities.md) - TypeORM Entities
- [Services](./infrastructure/services.md) - External adapters
- [Gateways](./infrastructure/gateways.md) - WebSocket

## Fundamental Principles

1. **Result Pattern** - Don't throw exceptions for expected flows
2. **Event Publishing** - Always `mergeObjectContext()` + `commit()`
3. **Immutability** - Immutable Value Objects and Aggregates
4. **Mappers** - Never expose entities/schemas outside infrastructure
