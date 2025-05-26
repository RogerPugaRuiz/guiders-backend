# Guía de Contribución

## Prerrequisitos

Antes de comenzar a contribuir al proyecto, asegúrate de tener instalado lo siguiente:

- **Node.js** (versión 18 o superior)
- **npm** (normalmente viene con Node.js)
- **Git**
- **Docker y Docker Compose** (opcional, para desarrollo con contenedores)

## Configuración del Entorno de Desarrollo

### 1. Clonar el Repositorio

```bash
git clone https://github.com/RogerPugaRuiz/guiders-backend.git
cd guiders-backend
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configuración de Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto basándote en el archivo `.env.example`:

```bash
cp .env.example .env
```

Edita el archivo `.env` con las configuraciones adecuadas para tu entorno local.

### 4. Iniciar el Servidor de Desarrollo

```bash
npm run start:dev
```

El servidor estará disponible en `http://localhost:3000` por defecto.

## Flujo de Trabajo de Desarrollo

### Estructura de Ramas

- `main`: Rama principal, contiene código estable listo para producción.
- `develop`: Rama de desarrollo, donde se integran las nuevas funcionalidades.
- `feature/*`: Ramas para nuevas funcionalidades (ej: `feature/auth-improvements`).
- `fix/*`: Ramas para correcciones de bugs (ej: `fix/login-issue`).
- `docs/*`: Ramas para cambios en documentación (ej: `docs/api-docs`).

### Proceso de Desarrollo

1. **Crear una nueva rama** desde `develop`:
   ```bash
   git checkout develop
   git pull
   git checkout -b feature/mi-nueva-funcionalidad
   ```

2. **Desarrollar la funcionalidad** siguiendo los estándares del proyecto.

3. **Ejecutar pruebas** para verificar que todo funciona correctamente:
   ```bash
   npm run test:unit
   npm run test:int
   ```

4. **Ejecutar el linter** para asegurar que el código sigue las convenciones:
   ```bash
   npm run lint
   ```

5. **Realizar commit** de los cambios siguiendo las convenciones de mensajes:
   ```bash
   git add .
   git commit -m "feat: añadir funcionalidad de autenticación con Google"
   ```

6. **Subir la rama** al repositorio remoto:
   ```bash
   git push -u origin feature/mi-nueva-funcionalidad
   ```

7. **Crear un Pull Request** hacia la rama `develop`.

## Convenciones de Código

### Nomenclatura

- **Variables y funciones**: camelCase (ej: `userService`, `findById`)
- **Clases**: PascalCase (ej: `UserController`, `AuthService`)
- **Archivos**: kebab-case (ej: `user-controller.ts`, `auth-service.ts`)
- **Constantes**: UPPER_SNAKE_CASE (ej: `MAX_RETRY_COUNT`, `DEFAULT_TIMEOUT`)
- **EventHandlers**: Patrón `<NewAction>On<OldAction>EventHandler` (ej: `CreateUserOnRegisterEventHandler`)

### Estructura de Carpetas

Seguir la estructura estándar de DDD y CQRS:
- `application/`: comandos, queries, eventos, DTOs
- `domain/`: entidades, value objects, repositorios, servicios de dominio
- `infrastructure/`: implementaciones concretas, controladores, adaptadores

### Pruebas

- Pruebas unitarias para cada componente significativo.
- Nombres descriptivos para las pruebas (ej: `should_create_user_when_valid_data_provided`).
- Uso de mocks para dependencias externas.

## Comandos Útiles

### Desarrollo

```bash
npm run start:dev           # Inicia el servidor en modo desarrollo
npm run start:debug         # Inicia el servidor en modo depuración
npm run lint                # Ejecuta el linter
npm run format              # Formatea el código con Prettier
```

### Pruebas

```bash
npm run test:unit           # Ejecuta pruebas unitarias
npm run test:int            # Ejecuta pruebas de integración
npm run test:e2e            # Ejecuta pruebas end-to-end
npm run test:cov            # Genera informe de cobertura
```

### Base de Datos y Migraciones

```bash
npm run typeorm:migrate:run          # Ejecuta migraciones pendientes
npm run typeorm:migrate:generate     # Genera una nueva migración
```

## Pull Requests

Al crear un Pull Request, asegúrate de:

1. Incluir un título descriptivo siguiendo el formato de Conventional Commits.
2. Completar la plantilla de PR proporcionada.
3. Asignar revisores.
4. Vincular el PR a cualquier issue relacionado.
5. Verificar que todas las pruebas automáticas pasen.

## Recursos Adicionales

- [Documentación de NestJS](https://docs.nestjs.com/)
- [Documentación de CQRS en NestJS](https://docs.nestjs.com/recipes/cqrs)
- [Patrones de Domain-Driven Design](https://martinfowler.com/tags/domain%20driven%20design.html)

## Contacto

Si tienes dudas sobre cómo contribuir, no dudes en contactar al autor del proyecto:
- Roger Puga Ruiz