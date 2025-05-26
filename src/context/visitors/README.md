# Contexto Visitors

Este contexto gestiona la lógica relacionada con visitantes, aplicando DDD y CQRS con NestJS v11 y @nestjs/cqrs.

## Estructura
- **application/**: Lógica de aplicación (commands, events, queries, dtos).
- **domain/**: Entidades, repositorios, eventos y value objects del dominio de visitantes.
- **infrastructure/**: Adaptadores, persistencia y controladores.

## Principios
- **DDD**: El dominio modela las reglas y procesos de negocio de visitantes.
- **CQRS**: Comandos y queries separados para claridad y escalabilidad.
- **Eventos**: Los cambios relevantes generan eventos manejados por EventHandlers.

## Intención
Permite gestionar la información y acciones de los visitantes de forma desacoplada, clara y escalable, facilitando la integración con otros contextos.
