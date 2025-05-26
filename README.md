# guiders-backend

Este proyecto es el backend de un producto orientado a comerciales, permitiendo que puedan comunicarse con los visitantes del sitio web en tiempo real y sin fricción.

## Descripción

**guiders-backend** provee la infraestructura de servidor necesaria para habilitar la comunicación instantánea entre comerciales y visitantes de la web. El objetivo es eliminar barreras y facilitar el contacto, mejorando la experiencia del usuario y potenciando la conversión.

## Tecnologías utilizadas

- [NestJS](https://nestjs.com/) (framework Node.js para el desarrollo de aplicaciones backend robustas y escalables)

## Instalación

1. Clona el repositorio:
   ```bash
   git clone https://github.com/RogerPugaRuiz/guiders-backend.git
   cd guiders-backend
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Configura las variables de entorno según tus necesidades (puedes partir del archivo `.env.example` si está disponible).

4. Inicia el servidor de desarrollo:
   ```bash
   npm run start:dev
   ```

## Ejemplo de uso

Tras iniciar el servidor, la API estará disponible en el puerto especificado (por defecto, 3000). Puedes consultar la documentación de los endpoints o integrar el backend con tu frontend para establecer la comunicación en tiempo real.

## Arquitectura general

Este proyecto sigue una arquitectura basada en **Domain-Driven Design (DDD)** y **Command Query Responsibility Segregation (CQRS)**, implementada sobre NestJS v11 y el paquete oficial `@nestjs/cqrs`. El objetivo es lograr un sistema desacoplado, escalable y fácil de mantener, donde cada contexto de negocio es autónomo y evoluciona de forma independiente.

### Principios clave

- **DDD**: El dominio es el núcleo de cada contexto, modelando las reglas y procesos de negocio mediante entidades, agregados, value objects y eventos de dominio.
- **CQRS**: Se separan los comandos (operaciones de escritura) de las queries (operaciones de lectura), permitiendo optimizar y escalar cada una de forma independiente.
- **Eventos**: Los cambios relevantes en el dominio generan eventos, que son manejados por EventHandlers siguiendo el patrón `<NewAction>On<OldAction>EventHandler`.
- **Estructura modular**: Cada contexto (por ejemplo, [auth](src/context/auth/README.md), [company](src/context/company/README.md), [conversations](src/context/conversations/README.md), [real-time](src/context/real-time/README.md), [tracking](src/context/tracking/README.md), [visitors](src/context/visitors/README.md), [shared](src/context/shared/README.md)) tiene su propio README explicando su propósito y estructura interna.

### Estructura de carpetas

- `src/context/<contexto>/application/` — Lógica de aplicación (commands, events, queries, dtos)
- `src/context/<contexto>/domain/` — Entidades, repositorios, value objects y eventos de dominio
- `src/context/<contexto>/infrastructure/` — Adaptadores, persistencia y controladores

Consulta el README de cada contexto para entender su responsabilidad y cómo se integra en la arquitectura global:

- [Auth](src/context/auth/README.md)
- [Company](src/context/company/README.md)
- [Conversations](src/context/conversations/README.md)
- [Real-Time](src/context/real-time/README.md)
- [Tracking](src/context/tracking/README.md)
- [Visitors](src/context/visitors/README.md)
- [Shared](src/context/shared/README.md)

## Documentación de procesos automatizados

- [Guía de automatización de Pull Requests](docs/pr-automation-guide.md): Cómo configurar y mantener la automatización de PRs, asegurando compatibilidad con linters de Markdown.

## Autor

- Roger Puga Ruiz

## Licencia

Este proyecto está licenciado bajo la licencia **Proprietary**. Todos los derechos reservados. No se permite la copia, distribución ni el uso del código sin permiso explícito del autor.
