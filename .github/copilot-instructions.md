# Guiders Backend - Instrucciones para Agentes AI

Backend NestJS 11 con arquitectura DDD+CQRS, multi-persistencia (PostgreSQL + MongoDB) y comunicación real-time.

## Arquitectura Core

### Estructura de Contextos
```
src/context/<contexto>/
  ├── domain/              # Lógica de negocio pura (sin deps externas)
  │   ├── entities/        # Aggregates (extienden AggregateRoot)
  │   ├── value-objects/   # Inmutables con validación
  │   ├── events/          # Eventos de dominio
  │   └── <entity>.repository.ts  # Interface + Symbol
  ├── application/         # Orquestación
  │   ├── commands/        # Write operations (@CommandHandler)
  │   ├── queries/         # Read operations (@QueryHandler)  
  │   ├── events/          # Side-effects (<Action>On<Event>EventHandler)
  │   └── dtos/           # Contratos API
  └── infrastructure/      # Adaptadores externos
      ├── controllers/     # HTTP/WebSocket endpoints
      ├── persistence/     # Repos (TypeORM/Mongoose)
      │   ├── impl/       # Implementaciones
      │   └── entity/     # Entidades ORM
      └── services/       # Integraciones externas
```

**Regla de dependencia**: `domain` ⇏ nada, `application` → `domain`, `infrastructure` → `application` + `domain`.

### Contextos Activos
- **V2 (MongoDB)**: `conversations-v2`, `visitors-v2` → Nuevas features aquí
- **V1 (PostgreSQL)**: `conversations`, `visitors` → Solo mantenimiento
- **Core**: `auth` (users/visitors/api-keys/bff), `company`, `tracking`, `real-time`
- **Shared**: Value objects comunes, `Result`, `Criteria`, utilidades

## Patrones Fundamentales

### 1. Modelado de Dominio
```typescript
// Aggregate Root
export class Chat extends AggregateRoot {
  private constructor(
    private readonly _id: ChatId,
    private readonly _status: ChatStatus,
    // ... más campos private readonly
  ) { super(); }

  // Factory que emite evento
  static create(visitorId: VisitorId, companyId: CompanyId): Chat {
    const chat = new Chat(ChatId.generate(), ChatStatus.pending(), /* ... */);
    chat.apply(new ChatCreatedEvent(chat.toPrimitives()));
    return chat;
  }

  // Rehidratación sin eventos
  static fromPrimitives(data: ChatPrimitives): Chat {
    return new Chat(
      ChatId.create(data.id),
      ChatStatus.create(data.status),
      // ...
    );
  }

  toPrimitives(): ChatPrimitives {
    return { id: this._id.value, status: this._status.value, /* ... */ };
  }
}
```

**Value Objects**: Extender `PrimitiveValueObject` o reutilizar de `shared/domain/value-objects`. No crear método `create()` si ya está en la base.

### 2. Result Pattern (Error Handling)
```typescript
import { Result, ok, err, okVoid } from 'shared/domain/result';

async findById(id: ChatId): Promise<Result<Chat, DomainError>> {
  try {
    const entity = await this.repository.findOne({ where: { id: id.value } });
    if (!entity) {
      return err(new ChatNotFoundError(`Chat ${id.value} no encontrado`));
    }
    return ok(ChatMapper.fromPersistence(entity));
  } catch (error) {
    return err(new ChatPersistenceError(error.message));
  }
}

// En controller
const result = await this.queryBus.execute(new GetChatQuery(id));
if (result.isErr()) {
  throw new NotFoundException(result.error.message);
}
return result.unwrap(); // Safe después de isErr check
```

**Regla**: No lanzar excepciones para flujos validables. Usar `Result` para errores esperados.

### 3. Eventos de Dominio (CRÍTICO)
```typescript
@CommandHandler(CreateChatCommand)
export class CreateChatCommandHandler {
  constructor(
    @Inject(CHAT_REPOSITORY) private repo: ChatRepository,
    private publisher: EventPublisher
  ) {}

  async execute(cmd: CreateChatCommand): Promise<Result<string, DomainError>> {
    const chat = Chat.create(cmd.visitorId, cmd.companyId);
    
    // CRÍTICO: mergeObjectContext + commit()
    const chatCtx = this.publisher.mergeObjectContext(chat);
    const saveResult = await this.repo.save(chatCtx);
    if (saveResult.isErr()) return saveResult;
    
    chatCtx.commit(); // ⚠️ Sin esto, eventos NO se publican
    return ok(chat.getId().value);
  }
}

// Event Handler (side-effects)
@EventsHandler(ChatCreatedEvent)
export class NotifyCommercialOnChatCreatedEventHandler {
  // Nombre: <AcciónNueva>On<EventoOriginal>EventHandler
}
```

### 4. Repositorios & Persistencia
```typescript
// Domain interface
export interface ChatRepository {
  save(chat: Chat): Promise<Result<void, DomainError>>;
  findById(id: ChatId): Promise<Result<Chat, DomainError>>;
  match(criteria: Criteria<Chat>): Promise<Result<Chat[], DomainError>>;
}
export const CHAT_REPOSITORY = Symbol('ChatRepository');

// Infrastructure implementation
@Injectable()
export class MongoChatRepositoryImpl implements ChatRepository {
  constructor(
    @InjectModel(ChatMongoEntity.name) private model: Model<ChatDocument>
  ) {}

  async match(criteria: Criteria<Chat>): Promise<Result<Chat[], DomainError>> {
    const fieldMap = { id: '_id', status: 'status', createdAt: 'createdAt' };
    const query = CriteriaConverter.toMongoQuery(criteria, fieldMap);
    const docs = await this.model.find(query).exec();
    return ok(docs.map(ChatMapper.fromPersistence));
  }
}

// En módulo
providers: [
  { provide: CHAT_REPOSITORY, useClass: MongoChatRepositoryImpl }
]
```

**Mappers**: `toPersistence(aggregate)` / `fromPersistence(entity)`. Nunca exponer entidades ORM/Mongoose fuera de infra.

### 5. CQRS Handlers
```typescript
// Command (write)
@CommandHandler(SendMessageCommand)
export class SendMessageCommandHandler {
  async execute(cmd: SendMessageCommand): Promise<Result<void, DomainError>> {
    // Orquestar: validar, modificar aggregate, persistir, publicar eventos
  }
}

// Query (read)
@QueryHandler(GetChatsWithFiltersQuery)
export class GetChatsWithFiltersQueryHandler {
  async execute(query: GetChatsWithFiltersQuery): Promise<ChatListResult> {
    // Optimizar lectura con proyecciones, índices, criterios encapsulados
  }
}
```

## Testing Patterns

### Unit Tests
```typescript
describe('AssignChatToCommercialCommandHandler', () => {
  let handler: AssignChatToCommercialCommandHandler;
  let mockRepo: jest.Mocked<ChatRepository>;

  beforeEach(async () => {
    mockRepo = { findById: jest.fn(), update: jest.fn(), /* ... */ };
    const module = await Test.createTestingModule({
      providers: [
        AssignChatToCommercialCommandHandler,
        { provide: CHAT_REPOSITORY, useValue: mockRepo },
        { provide: EventPublisher, useValue: { mergeObjectContext: jest.fn() } }
      ]
    }).compile();
    handler = module.get(AssignChatToCommercialCommandHandler);
  });

  it('debe asignar exitosamente con UUIDs válidos', async () => {
    const chatId = Uuid.random().value; // ⚠️ Usar UUIDs reales
    const commercialId = Uuid.random().value;
    
    mockRepo.findById.mockResolvedValue(ok(mockChat));
    mockRepo.update.mockResolvedValue(okVoid());
    
    const result = await handler.execute(new AssignCommand({ chatId, commercialId }));
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual({ assignedCommercialId: commercialId });
  });
});
```

**Comandos**:
- Unit: `npm run test:unit` (SQLite en memoria, fast)
- Integración: `npm run test:int` (Postgres + Mongo reales)
- E2E: `npm run test:e2e` (servidor completo)

**Patrón E2E**:
- Usar servicios reales (docker-compose con perfiles `test`)
- Mock guards: `MockAuthGuard`, `MockOptionalAuthGuard`
- Mock domain objects con `toPrimitives()` y `getValue()`
- Timeout: 120s (configurado en jest)

### 6. WebSockets (Real-Time)
```typescript
@WebSocketGateway()
@UseGuards(WsAuthGuard, WsRolesGuard)
export class ChatGateway {
  @SubscribeMessage('chat:send-message')
  @Roles(['visitor', 'commercial'])
  async handleMessage(@ConnectedSocket() client: Socket, @MessageBody() payload: SendMessageDto) {
    // ⚠️ Siempre delegar a CommandBus/QueryBus
    const result = await this.commandBus.execute(new SendMessageCommand(payload));
    
    // Respuesta uniforme
    return ResponseBuilder.create()
      .addSuccess(result.isOk())
      .addMessage(result.isOk() ? 'Mensaje enviado' : result.error.message)
      .addData(result.isOk() ? result.unwrap() : null)
      .build();
  }
}
```

**Guards**: `WsAuthGuard` + `WsRolesGuard` obligatorios. Gateway = orquestador, sin lógica de dominio.

## Multi-Persistencia

### PostgreSQL (TypeORM)
- Contextos: `auth`, `company`, `tracking`, `conversations` (V1), `visitors` (V1)
- Uso: Datos transaccionales, relaciones complejas, integridad referencial

```typescript
// CriteriaConverter para queries seguras
const { sql, parameters } = CriteriaConverter.toPostgresSql(
  criteria,
  'visitors',
  { id: 'id', name: 'name', email: 'email' }
);
const entities = await this.repository
  .createQueryBuilder('visitors')
  .where(sql.replace(/^WHERE /, ''))
  .setParameters(parameters)
  .getMany();
```

### MongoDB (Mongoose)
- Contextos: `conversations-v2`, `visitors-v2`, `commercial`
- Uso: Alto volumen, agregaciones, métricas, queries complejas de lectura

```typescript
// Proyecciones para performance
const chats = await this.model
  .find(query)
  .select('_id status createdAt') // Solo campos necesarios
  .lean() // Plain JS objects, no Mongoose overhead
  .exec();
```

**Migración V1→V2**: Coexistencia temporal. Nuevas features solo en V2.

## API Key Flow (Public APIs)

```typescript
// 1. Frontend envía domain + apiKey (externos)
POST /api/visitors/identify
{ "domain": "example.com", "apiKey": "abc123", ... }

// 2. Handler auto-resuelve tenant/site
const validation = await this.validateApiKey.execute(command.domain, command.apiKey);
if (validation.isErr()) return validation;

const companyResult = await this.companyRepo.findByDomain(command.domain);
const company = companyResult.unwrap();

const sites = company.getSites().toPrimitives();
const targetSite = sites.find(s => 
  s.canonicalDomain === command.domain || 
  s.domainAliases.includes(command.domain)
);

// 3. Generar UUIDs internos
const tenantId = new TenantId(company.getId().getValue());
const siteId = new SiteId(targetSite.id);
```

## Desarrollo Rápido

### CLI Interna
```bash
node bin/guiders-cli.js clean-database --force
node bin/guiders-cli.js create-company-with-admin \
  --name "Test Co" --domain "test.com" \
  --adminName "Admin" --adminEmail "admin@test.com"
```

### Workflow Nueva Feature
1. **Domain**: VO → Aggregate → Events → Repository interface
2. **Application**: Command/Query → Handler → DTO
3. **Infrastructure**: Controller → Repository impl → Mappers
4. **Persistencia**: Migración SQL / Schema Mongo + índices
5. **Tests**: Unit (domain logic) + Integration (repos) + E2E (endpoints)
6. **Docs**: Swagger + README si cambia contrato

### Autenticación Dual
- **DualAuthGuard**: JWT Bearer || BFF cookies (Keycloak) || Visitor session → Falla si ninguno válido
- **OptionalAuthGuard**: Mismos métodos pero NO falla → Poblar `request.user` si hay auth

## Anti-Patrones (Bloquear)

❌ Lógica de negocio en controllers/gateways  
❌ Excepciones para flujo validable (usar `Result`)  
❌ SQL manual concatenado (usar `CriteriaConverter` + QueryBuilder)  
❌ Exponer entidades TypeORM/Mongoose fuera de infra  
❌ Olvidar `commit()` en command handlers → eventos no se publican  
❌ Importar infra desde domain  
❌ Handlers sin patrón de nombres `<Action>On<Event>EventHandler`  
❌ UUIDs fake en tests (usar `Uuid.random().value`)

## Checklist PR

- [ ] VO/Result aplicados correctamente
- [ ] Eventos publicados con `mergeObjectContext` + `commit()`
- [ ] Repos usan mappers y esconden detalles ORM
- [ ] Migración/índice creado si campo filtrable nuevo
- [ ] Tests verdes (unit + int/E2E si aplica) y cobertura OK
- [ ] `npm run lint` y `npm run format` sin errores
- [ ] Swagger + READMEs actualizados si cambia contrato

## Idioma

**Código**: Identificadores en inglés  
**Documentación**: Comentarios, Swagger, mensajes de error en español técnico neutro  
**Excepción**: APIs externas / protocolos estándar (OAuth, etc.) requieren inglés

---

**Contextos específicos**: Ver `src/context/<ctx>/README.md` para detalles por contexto.  
**Instrucciones específicas**: `.github/instructions/{domain,infrastructure,tests}.instructions.md` aplican automáticamente por patrón de archivo.
### Context7 (cuándo leer docs externas)
Usar solo si falta en repo y afecta decisión (APIs Angular 20, signals avanzados, DI tree-shakable, Jest timers). Proceso: buscar local → si falta `resolve-library-id` → `get-library-docs(topic)` tokens ≤6000 → resumir y aplicar citando ("Context7: signals"). No para sintaxis básica.

### Playwright MCP
Mantener prompts concisos (≤8 líneas). Incluir: Objetivo, URL inicial, pasos clave, selectores críticos, datos a capturar, criterio de éxito, límites.