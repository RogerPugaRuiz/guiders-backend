# Guiders Backend - AI Coding Instructions

## Arquitectura General
Este es un backend de comunicación comercial en tiempo real construido con **NestJS v11**, **DDD** y **CQRS**. El proyecto sigue una arquitectura de contextos separados por dominio de negocio.

### Estructura de Contextos
- `src/context/auth/` - Autenticación (visitantes, usuarios, API keys)
- `src/context/conversations/` - Chats y mensajes 
- `src/context/conversations-v2/` - Nueva versión de conversaciones
- `src/context/real-time/` - WebSockets y notificaciones en tiempo real
- `src/context/company/` - Gestión de empresas
- `src/context/visitors/` - Perfiles de visitantes
- `src/context/tracking/` - Eventos de seguimiento
- `src/context/shared/` - Value objects y utilidades compartidas

Cada contexto tiene su estructura DDD: `domain/`, `application/`, `infrastructure/`

## Patrones Críticos

### EventHandlers Cross-Context
Los EventHandlers siguen el patrón `<NewAction>On<OldAction>EventHandler` y CRUZAN contextos para mantener consistencia:
```typescript
@EventsHandler(CompanyCreatedEvent)
export class CreateApiKeyOnCompanyCreatedEventHandler 
  implements IEventHandler<CompanyCreatedEvent> {
  // Escucha eventos de 'company' desde 'auth' context
}

@EventsHandler(ParticipantAssignedEvent) 
export class NotifyOnParticipantAssignedToChatEventHandler {
  // Escucha eventos de 'conversations' desde 'real-time' context
}
```

### Value Objects Compartidos
SIEMPRE usa los value objects del contexto shared:
```typescript
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
// Para tests: Uuid.random().value
// Para generación: Uuid.generate()
```

### Result Pattern Sin Excepciones
Para manejo de errores sin excepciones en el dominio:
```typescript
import { ok, err } from 'src/context/shared/domain/result';

async findById(id: UserId): Promise<Result<User, DomainError>> {
  const user = await this.repository.findById(id);
  return user ? ok(user) : err(new UserNotFoundError(id));
}
```

### Repositorios con CriteriaConverter
OBLIGATORIO usar CriteriaConverter para consultas dinámicas:
```typescript
const { sql, parameters } = CriteriaConverter.toPostgresSql(criteria, 'tableName', fieldMap);
const entities = await this.repository
  .createQueryBuilder('alias')
  .where(sql.replace(/^WHERE /, ''))
  .setParameters(parameters)
  .getMany();
```

### Configuración Multi-Base de Datos Automática
El `app.module.ts` detecta automáticamente el entorno y configura:
- **test**: SQLite (memoria) para tests unitarios
- **test + e2e**: PostgreSQL para tests e2e  
- **development/production**: PostgreSQL + MongoDB

MongoDB se usa específicamente para mensajes cifrados, PostgreSQL para datos relacionales.

## Comandos Esenciales

### Desarrollo
```bash
npm run start:dev         # Servidor con hot-reload
npm run lint              # ESLint con auto-fix
npm run build             # Compilar proyecto
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

### CLI Tools de Desarrollo
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

### Estructura Application Layer
```
application/
├── commands/           # Comandos (escritura)
├── events/            # Event handlers
├── queries/           # Queries (lectura)  
└── dtos/             # Data Transfer Objects
```

### Imports y Dependencies
- NUNCA `require()` dinámico - solo `import` estático al inicio
- Evitar carpetas técnicas (`utils`, `helpers`) - usar nombres de propósito (`email`, `auth`)
- Tests en carpetas `__tests__/` junto al código

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

### Flujo Post-Cambios
1. Ajustar tests relacionados
2. Ejecutar tests: `npm run test:unit`
3. Ejecutar linter: `npm run lint`
4. Para migraciones: `npm run typeorm:migrate:run`

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

## Mejores Prácticas Específicas

### Manejo de Errores con Result
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

### Event Publisher Pattern
```typescript
const chatAggregate = this.publisher.mergeObjectContext(updatedChat);
await this.chatRepository.save(chatAggregate);
chatAggregate.commit(); // SIEMPRE commit después de save
```

### CriteriaBuilder para Consultas Dinámicas
```typescript
const criteria = this.criteriaBuilder
  .addFilter('status', Operator.EQUALS, Status.PENDING.value)
  .addFilter('companyId', Operator.EQUALS, companyId)
  .setLimit(10)
  .build();
```

### Context7 para Documentación
Si te preguntan sobre documentación de lenguajes, frameworks o librerías, usa la herramienta `context7` para buscar la documentación oficial y proporcionar un resumen claro y conciso.