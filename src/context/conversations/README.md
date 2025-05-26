# Contexto Conversations

Este contexto orquesta la lógica de conversaciones y mensajería, aplicando DDD y CQRS con NestJS v11 y @nestjs/cqrs.

## Estructura
- **application/**: Lógica de aplicación (commands, events, queries, dtos) para chat y mensajes.
- **domain/**: Entidades, repositorios, eventos y value objects del dominio conversacional.
- **infrastructure/**: Adaptadores, persistencia y controladores.

## Principios
- **DDD**: El dominio modela las reglas y procesos de negocio de las conversaciones.
- **CQRS**: Comandos y queries separados para claridad y escalabilidad.
- **Eventos**: Los cambios relevantes generan eventos manejados por EventHandlers.

## Intención
Permite gestionar conversaciones y mensajes de forma desacoplada, clara y escalable, facilitando la integración con otros contextos.
