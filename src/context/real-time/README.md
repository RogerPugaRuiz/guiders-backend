# Contexto Real-Time

Este contexto gestiona la lógica de tiempo real (por ejemplo, conexiones de usuarios, asignaciones comerciales) siguiendo DDD y CQRS con NestJS v11 y @nestjs/cqrs.

## Estructura
- **application/**: Lógica de aplicación (commands, events, queries, dtos, usecases).
- **domain/**: Entidades, servicios de dominio, repositorios y eventos.
- **infrastructure/**: Adaptadores, persistencia y controladores.

## Principios
- **DDD**: El dominio modela las reglas y procesos de negocio de tiempo real.
- **CQRS**: Comandos y queries separados para claridad y escalabilidad.
- **Eventos**: Los cambios relevantes generan eventos manejados por EventHandlers.

## Intención
Permite gestionar funcionalidades de tiempo real de forma desacoplada, clara y escalable, facilitando la integración con otros contextos.
