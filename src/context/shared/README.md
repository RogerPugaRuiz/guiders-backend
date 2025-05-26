# Contexto Shared

Este contexto contiene elementos compartidos entre los distintos contextos, siguiendo DDD y CQRS con NestJS v11 y @nestjs/cqrs.

## Estructura
- **domain/**: Value objects, errores y utilidades de dominio compartidas.
- **infrastructure/**: Implementaciones compartidas de infraestructura.

## Principios
- **DDD**: Modela conceptos transversales reutilizables en otros contextos.
- **CQRS**: Aplica separación de comandos y queries cuando es relevante.

## Intención
Facilita la reutilización y consistencia de conceptos comunes en toda la arquitectura, evitando duplicidad y promoviendo buenas prácticas.
