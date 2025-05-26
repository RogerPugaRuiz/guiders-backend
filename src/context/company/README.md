# Contexto Company

Este contexto gestiona la lógica relacionada con compañías, aplicando DDD y CQRS con NestJS v11 y @nestjs/cqrs.

## Estructura
- **application/**: Lógica de aplicación (commands, events, queries, dtos).
- **domain/**: Entidades, repositorios, eventos y value objects del dominio de compañías.
- **infrastructure/**: Adaptadores, persistencia y controladores.

## Principios
- **DDD**: El dominio modela las reglas y procesos de negocio de compañías.
- **CQRS**: Comandos y queries separados para claridad y escalabilidad.
- **Eventos**: Los cambios importantes generan eventos manejados por EventHandlers.

## Intención
Permite mantener y evolucionar la lógica de compañías de forma desacoplada, clara y escalable, facilitando la integración con otros contextos.
