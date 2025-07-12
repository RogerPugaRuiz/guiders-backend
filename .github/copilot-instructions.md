# Guiders Backend - AI Coding Instructions

## Arquitectura General
Este es un backend de comunicación comercial en tiempo real construido con **NestJS v11**, **DDD** y **CQRS**. El proyecto sigue una arquitectura de contextos separados por dominio de negocio.

### Estructura de Contextos
- `src/context/auth/` - Autenticación (visitantes, usuarios, API keys)
- `src/context/conversations/` - Chats y mensajes
- `src/context/real-time/` - WebSockets y notificaciones en tiempo real
- `src/context/company/` - Gestión de empresas
- `src/context/visitors/` - Perfiles de visitantes
- `src/context/tracking/` - Eventos de seguimiento
- `src/context/shared/` - Value objects y utilidades compartidas

Cada contexto tiene su estructura DDD: `domain/`, `application/`, `infrastructure/`

## Patrones Críticos

### EventHandlers Obligatorios
Los EventHandlers siguen el patrón `<NewAction>On<OldAction>EventHandler`:
```typescript
@EventsHandler(CompanyCreatedEvent)
export class CreateApiKeyOnCompanyCreatedEventHandler 
  implements IEventHandler<CompanyCreatedEvent> {}
```

### Value Objects Compartidos
SIEMPRE usa los value objects del contexto shared:
```typescript
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
// Para tests: Uuid.random().value
// Para generación: Uuid.generate()
```

### Result Pattern
Para manejo de errores sin excepciones:
```typescript
async findById(id: UserId): Promise<Result<User, DomainError>> {
  // Retorna ok(user) o err(new UserNotFoundError())
}
```

### Repositorios con CriteriaConverter
```typescript
const { sql, parameters } = CriteriaConverter.toPostgresSql(criteria, 'tableName', fieldMap);
const entities = await this.repository
  .createQueryBuilder('alias')
  .where(sql.replace(/^WHERE /, ''))
  .setParameters(parameters)
  .getMany();
```

## Comandos Esenciales

### Desarrollo
```bash
npm run start:dev         # Servidor con hot-reload
npm run lint              # ESLint con auto-fix
```

### Testing
```bash
npm run test:unit         # Tests unitarios con coverage
npm run test:int          # Tests de integración
npm run test:e2e          # Tests end-to-end
```

### Base de Datos
```bash
npm run typeorm:migrate:run    # Ejecutar migraciones
node bin/guiders-cli.js clean-database --force    # Limpiar BD para desarrollo
```

### CLI Tools
```bash
node bin/guiders-cli.js create-company --name "Empresa" --domain "empresa.com"
node bin/guiders-cli.js create-company-with-admin --name "Empresa" --domain "empresa.com" --adminName "Admin" --adminEmail "admin@email.com"
```

## Reglas de Codificación Estrictas

### Nomenclatura
- **Variables/funciones**: camelCase
- **Clases**: PascalCase  
- **Archivos**: kebab-case
- **Comentarios**: en español explicando la intención

### Estructura Application
```
application/
├── commands/
├── events/
├── queries/
└── dtos/
```

### Imports y Dependencies
- NUNCA `require()` dinámico - solo `import` estático al inicio
- Evitar carpetas técnicas (`utils`, `helpers`) - usar nombres de propósito (`email`, `auth`)
- Tests en carpetas `__tests__/` junto al código

### Flujo Post-Cambios
1. Ajustar tests relacionados
2. Ejecutar tests: `npm run test:unit`
3. Ejecutar linter: `npm run lint`
4. Para migraciones: `npm run typeorm:migrate:run`

## Configuración Multi-Entorno
El proyecto soporta múltiples bases de datos:
- **PostgreSQL** (principal) - con TypeORM
- **MongoDB** (para ciertos datos) - con Mongoose
- **SQLite** (tests) - configuración automática

Variables de entorno diferentes para test/development/production manejadas automáticamente en `app.module.ts`.

## Patrones de Inyección de Dependencias

### Símbolos de Inyección
Usa símbolos para interfaces de repositorios y servicios:
```typescript
export const USER_REPOSITORY = Symbol('UserRepository');
export const NOTIFICATION = Symbol('INotification');

// En el módulo
{ provide: USER_REPOSITORY, useClass: UserRepositoryImpl }
```

### Mappers Obligatorios
Separa la lógica de mapeo en clases dedicadas:
```typescript
export class UserMapper {
  static toPersistence(user: User): UserEntity { /* ... */ }
  static fromPersistence(entity: UserEntity): User { /* ... */ }
}
```

## Comunicación WebSocket

### Estructura de Respuestas
```typescript
ResponseBuilder.create()
  .addSuccess(true)
  .addMessage('Operación exitosa')
  .addData({ chatId, timestamp })
  .addType('chat_message')
  .build()
```

### Eventos WebSocket Principales
- `visitor:send-message` - Visitante envía mensaje
- `commercial:send-message` - Comercial responde
- `visitor:start-chat` - Iniciar conversación
- `commercial:viewing-chat` - Comercial viendo chat
- `health-check` - Verificar conexión

### Autenticación WebSocket
```typescript
@Roles(['visitor'])
@UseGuards(WsAuthGuard, WsRolesGuard)
@SubscribeMessage('visitor:send-message')
async handleVisitorMessage(client: AuthenticatedSocket, event: Event) {
  // Token en client.handshake.auth.token
  // Usuario en client.user.sub
}
```

## Estructura de Tests

### Ubicación y Nomenclatura
- Tests unitarios: `__tests__/` junto al código
- Tests de integración: `jest-int.json` 
- Tests e2e: `test/` en la raíz
- Cobertura: `npm run test:unit` (con coverage automático)

### Mocks Tipados
```typescript
const mockRepository: jest.Mocked<UserRepository> = {
  save: jest.fn(),
  findById: jest.fn(),
};
```

### Datos de Test
```typescript
// Siempre usar Uuid.random().value para UUIDs en tests
const testUser = User.create({
  id: UserId.create(Uuid.random().value),
  email: UserEmail.create('test@example.com'),
});
```

## Integración Multi-Base de Datos

### Configuración Automática por Entorno
El `app.module.ts` detecta automáticamente:
- **test**: SQLite (memoria) para tests unitarios
- **test + e2e**: PostgreSQL para tests e2e
- **development/production**: PostgreSQL + MongoDB

### Selección de Repositorio
```typescript
// PostgreSQL para datos relacionales
{ provide: USER_REPOSITORY, useClass: TypeOrmUserRepository }

// MongoDB para mensajes (con cifrado)
{ provide: MESSAGE_REPOSITORY, useClass: MongoMessageRepository }
```

## Mejores Prácticas Específicas

### Manejo de Errores
```typescript
// Usar Result pattern, no excepciones en el dominio
async findUser(id: string): Promise<Result<User, UserNotFoundError>> {
  const user = await this.repository.findById(id);
  return user ? ok(user) : err(new UserNotFoundError(id));
}
```

### Eventos Cross-Context
```typescript
// EventHandlers cruzan contextos para mantener consistencia
@EventsHandler(CompanyCreatedEvent)
export class CreateApiKeyOnCompanyCreatedEventHandler {
  // Escucha eventos de 'company' desde 'auth' context
}
```

### CLI de Desarrollo
```bash
# Comandos específicos para desarrollo rápido
node bin/guiders-cli.js create-company-with-admin \
  --name "Test Company" \
  --domain "test.com" \
  --adminName "Admin" \
  --adminEmail "admin@test.com"
```