# Copilot Instructions

## Estilo de Commits

Los mensajes de commit deben seguir la convención `tipo(scope): descripción`, donde:

- **tipo**: Indica el propósito del cambio. Puede ser uno de los siguientes:
  - `feat`: Nueva funcionalidad.
  - `fix`: Corrección de errores.
  - `refactor`: Reestructuración del código sin cambios en la funcionalidad.
  - `perf`: Mejoras de rendimiento.
  - `docs`: Cambios en la documentación.
  - `test`: Agregado o modificación de pruebas.
  - `build`: Cambios en la configuración de build o dependencias.
  - `chore`: Mantenimiento general del código (sin afectar el código de producción).
  - `style`: Cambios en el formato (espacios, puntos y comas, etc.).
  - `ci`: Cambios en la configuración de integración continua.

- **scope** (opcional): Indica el módulo o contexto del cambio, por ejemplo: `auth`, `calendar`, `live-chat`, `core`.

- **descripción**: Un resumen claro y conciso del cambio (en tiempo presente, sin mayúscula inicial y sin punto final).

## Estructura del proyecto

src
|__ context
|   |__ commercial
|   |__ pixel
|   |__ shared
|   |__ tracking
