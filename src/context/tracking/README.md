# Contexto Tracking

Este contexto gestiona la lógica de tracking y auditoría, aplicando DDD y CQRS con NestJS v11 y @nestjs/cqrs.

## Estructura
- **application/**: Lógica de aplicación (commands, events, queries, dtos).
- **domain/**: Entidades, repositorios, eventos y value objects del dominio de tracking.
- **infrastructure/**: Adaptadores, persistencia y controladores.

## Principios
- **DDD**: El dominio modela las reglas y procesos de negocio de tracking.
- **CQRS**: Comandos y queries separados para claridad y escalabilidad.
- **Eventos**: Los cambios relevantes generan eventos manejados por EventHandlers.

## Intención
Permite auditar y rastrear acciones del sistema de forma desacoplada, clara y escalable, facilitando la integración con otros contextos.
