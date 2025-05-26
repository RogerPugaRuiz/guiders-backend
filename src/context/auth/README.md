# Contexto Auth

Este contexto implementa la autenticación y autorización de usuarios y visitantes siguiendo los principios de DDD (Domain-Driven Design) y CQRS (Command Query Responsibility Segregation) usando NestJS v11 y el paquete @nestjs/cqrs.

## Estructura
- **application/**: Contiene la lógica de aplicación dividida en subcarpetas: commands, events, queries y dtos.
- **domain/**: Define las entidades, agregados, repositorios, eventos de dominio y value objects.
- **infrastructure/**: Implementa la persistencia, controladores y adaptadores externos.

## Principios
- **DDD**: El dominio es el núcleo, modelando reglas de negocio y comportamientos.
- **CQRS**: Se separan los comandos (escritura) de las queries (lectura) para mayor claridad y escalabilidad.
- **Eventos**: Los cambios relevantes generan eventos que pueden ser manejados por EventHandlers siguiendo el patrón `<NewAction>On<OldAction>EventHandler`.

## Intención
Esta arquitectura permite escalar y mantener el contexto de autenticación de forma robusta, desacoplando la lógica de negocio de la infraestructura y facilitando la extensión de funcionalidades.
