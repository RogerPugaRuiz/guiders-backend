# Arquitectura Técnica de Guiders Backend

## Visión General

El backend de Guiders está construido siguiendo una arquitectura hexagonal basada en los principios de Domain-Driven Design (DDD) y Command Query Responsibility Segregation (CQRS). Esta arquitectura permite un alto grado de desacoplamiento entre los diferentes componentes del sistema, facilita la escalabilidad y mejora la mantenibilidad del código.

## Diagrama de Arquitectura General

![Arquitectura General](/docs/diagrams/architecture-overview.mmd)

## Principios Arquitectónicos

### Domain-Driven Design (DDD)

El proyecto adopta DDD como enfoque de diseño y modelado del sistema. Esto implica:

- **Dominio Central**: Las reglas de negocio y la lógica específica del dominio están en el núcleo de la aplicación.
- **Lenguaje Ubicuo**: Se utiliza un vocabulario común entre desarrolladores y expertos del dominio.
- **Contextos Delimitados**: La aplicación está dividida en contextos claramente definidos (auth, company, conversations, etc.).
- **Entidades y Value Objects**: Se modelan objetos con identidad (Entidades) y objetos inmutables sin identidad (Value Objects).
- **Agregados**: Grupos de entidades y value objects tratados como una unidad atómica.
- **Repositorios**: Interfaces para persistir y recuperar objetos del dominio.

### Command Query Responsibility Segregation (CQRS)

El patrón CQRS separa las operaciones de lectura (Queries) de las operaciones de escritura (Commands):

- **Commands**: Encapsulan una intención de cambiar el estado del sistema.
- **Queries**: Recuperan datos del sistema sin provocar efectos secundarios.
- **Event Handlers**: Procesan eventos generados por cambios en el dominio.

## Flujo de Trabajo CQRS

1. **Command**: Un controlador recibe una petición HTTP y la traduce a un Command.
2. **Command Handler**: Procesa el command, aplica la lógica de negocio y modifica el estado del sistema.
3. **Eventos de Dominio**: El Command Handler puede generar eventos de dominio que representan cambios significativos.
4. **Event Handlers**: Reaccionan a los eventos de dominio para mantener vistas, enviar notificaciones, etc.
5. **Queries**: Se ejecutan para obtener datos del sistema, posiblemente de vistas optimizadas.

## Estructura de Carpetas

Cada contexto sigue una estructura estándar:

```
src/context/<contexto>/
├── application/
│   ├── commands/       # Comandos y sus manejadores
│   ├── events/         # Eventos y sus manejadores
│   ├── queries/        # Consultas y sus manejadores
│   └── dtos/           # Objetos de transferencia de datos
├── domain/
│   ├── models/         # Entidades y objetos de valor
│   ├── repositories/   # Interfaces de repositorios
│   ├── services/       # Servicios de dominio
│   └── events/         # Eventos de dominio
└── infrastructure/
    ├── controllers/    # Controladores de API
    ├── repositories/   # Implementaciones de repositorios
    ├── services/       # Servicios de infraestructura
    └── entities/       # Entidades ORM
```

## Tecnologías Principales

- **NestJS**: Framework para crear aplicaciones escalables del lado del servidor.
- **TypeScript**: Lenguaje principal de desarrollo.
- **@nestjs/cqrs**: Implementación oficial de CQRS para NestJS.
- **TypeORM**: ORM para la capa de persistencia.
- **Socket.IO**: Para comunicación en tiempo real.
- **JWT**: Para autenticación y manejo de tokens.

## Flujos Principales

### Registro y Autenticación de Visitantes

1. El visitante accede al sitio web del cliente.
2. Se envía una solicitud de registro con la API key del cliente.
3. El sistema valida la API key y el dominio.
4. Se crea una cuenta de visitante y se generan tokens.
5. El visitante queda autenticado para interactuar.

### Comunicación en Tiempo Real

1. El visitante establece una conexión WebSocket.
2. El sistema autentica la conexión mediante token.
3. El visitante es visible para los comerciales de la empresa.
4. Los comerciales pueden iniciar o responder a conversaciones.
5. Los mensajes se entregan en tiempo real a ambas partes.

### Seguimiento de Actividad

1. Las acciones del visitante generan eventos de tracking.
2. Los eventos son capturados y procesados por el sistema.
3. Se actualiza la información de actividad del visitante.
4. Los comerciales pueden visualizar esta actividad.

## Patrones de Diseño Utilizados

- **Repository**: Abstracción sobre la capa de persistencia.
- **Factory**: Creación de objetos complejos.
- **Adapter**: Adaptación entre sistemas externos y nuestro dominio.
- **Decorator**: Aplicado mediante decoradores de TypeScript y NestJS.
- **Observer**: Implementado a través del sistema de eventos.
- **Strategy**: Para comportamientos intercambiables en tiempo de ejecución.