# Contexto Visitors

Este contexto gestiona la lógica relacionada con visitantes, aplicando DDD y CQRS con NestJS v11 y @nestjs/cqrs.

## Estructura

- **application/**: Lógica de aplicación (commands, events, queries, dtos).
  - **commands/**: Comandos para operaciones con visitantes.
  - **events/**: Manejadores de eventos de dominio relacionados con visitantes.
  - **queries/**: Consultas para obtener información de visitantes.
  - **dtos/**: Objetos de transferencia de datos.
  - **services/**: Puertos (interfaces) para servicios de aplicación.
- **domain/**: Entidades, repositorios, eventos y value objects del dominio de visitantes.
  - **models/**: Entidades como Visitor y VisitorProfile.
  - **repositories/**: Interfaces de repositorios.
  - **events/**: Eventos de dominio específicos de visitantes.
- **infrastructure/**: Adaptadores, persistencia y controladores.
  - **controllers/**: API REST para operaciones con visitantes.
  - **repositories/**: Implementaciones de repositorios con TypeORM.
  - **persistence/**: Entidades ORM y mappers.
  - **services/**: Adaptadores para servicios externos (Faker.js para alias).

## Principios

- **DDD**: El dominio modela las reglas y procesos de negocio de visitantes.
- **CQRS**: Comandos y queries separados para claridad y escalabilidad.
- **Eventos**: Los cambios relevantes generan eventos manejados por EventHandlers.

## Funcionalidades principales

### Generación automática de alias

Los visitantes nuevos reciben automáticamente un alias amigable generado por el sistema:

```typescript
// Puerto definido en application/services/
export interface AliasGeneratorService {
  generate(): string;
}

// Implementación con Faker.js en infrastructure/services/
@Injectable()
export class FakerAliasGeneratorAdapter implements AliasGeneratorService {
  generate(): string {
    // Genera alias como "Brave Lion", "Clever Fox", etc.
    const adjective = faker.word.adjective();
    const animal = /* selección aleatoria de animales */;
    return `${capitalizedAdjective} ${capitalizedAnimal}`;
  }
}
```

El sistema asigna automáticamente estos alias al crear visitantes por defecto, proporcionando identificadores amigables y únicos.

## Componentes principales

### Agregados y entidades

- **Visitor**: Representa un visitante de un sitio web.
- **VisitorProfile**: Contiene información adicional sobre el visitante.
- **VisitorIntent**: Registra las intenciones o intereses del visitante.

### Value Objects

```typescript
export class VisitorId {
  private constructor(private readonly value: Uuid) {}

  static create(value?: string): VisitorId {
    return new VisitorId(Uuid.create(value));
  }

  toString(): string {
    return this.value.toString();
  }
}

export class VisitorName {
  private constructor(private readonly value: string) {}

  static create(value: string): VisitorName {
    if (!value || value.trim().length < 2) {
      throw new InvalidVisitorNameError(value);
    }
    return new VisitorName(value.trim());
  }

  get value(): string {
    return this.value;
  }
}
```

## Flujos principales

### Creación y actualización de perfil de visitante

```
┌───────────┐     ┌─────────────────┐     ┌──────────────────┐
│  Cliente  │────▶│  Controller     │────▶│CreateVisitorCmd  │
└───────────┘     └─────────────────┘     └──────────────────┘
                                                   │
                                                   ▼
┌───────────────┐     ┌─────────────────┐     ┌──────────────────┐
│EventHandlers  │◀────│VisitorCreated   │◀────│  VisitorEntity   │
└───────────────┘     └─────────────────┘     └──────────────────┘
```

1. El cliente envía información para crear o actualizar un visitante.
2. El controller recibe la petición y crea un comando.
3. El CommandHandler procesa el comando y crea/actualiza el Visitor.
4. Se guarda la entidad y se emiten eventos de dominio.
5. Los EventHandlers pueden reaccionar para realizar acciones adicionales.

### Consulta de visitantes activos

```typescript
@QueryHandler(FindActiveVisitorsQuery)
export class FindActiveVisitorsHandler implements IQueryHandler<FindActiveVisitorsQuery> {
  constructor(
    @Inject(VISITOR_REPOSITORY)
    private readonly repository: VisitorRepository,
  ) {}

  async execute(query: FindActiveVisitorsQuery): Promise<VisitorDto[]> {
    const { companyId, minutes } = query;
    const companyIdVO = CompanyId.create(companyId);
    const timestamp = new Date();
    timestamp.setMinutes(timestamp.getMinutes() - minutes);
    
    const visitors = await this.repository.findActiveByCompany(
      companyIdVO,
      timestamp,
    );
    
    return visitors.map(visitor => VisitorMapper.toDto(visitor));
  }
}
```

## Ejemplos de uso

### Registrar un nuevo visitante

```typescript
// Controller
@Controller('visitors')
export class VisitorsController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  async createVisitor(@Body() dto: CreateVisitorDto) {
    return this.commandBus.execute(
      new CreateVisitorCommand({
        name: dto.name,
        email: dto.email,
        companyId: dto.companyId,
        metadata: dto.metadata,
      }),
    );
  }
}

// Command Handler
@CommandHandler(CreateVisitorCommand)
export class CreateVisitorHandler implements ICommandHandler<CreateVisitorCommand> {
  constructor(
    @Inject(VISITOR_REPOSITORY)
    private readonly repository: VisitorRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: CreateVisitorCommand): Promise<void> {
    const { name, email, companyId, metadata } = command;
    
    const visitor = Visitor.create({
      name: name ? VisitorName.create(name) : undefined,
      email: email ? VisitorEmail.create(email) : undefined,
      companyId: CompanyId.create(companyId),
      metadata: metadata ? VisitorMetadata.create(metadata) : undefined,
    });
    
    const visitorWithPublisher = this.publisher.mergeObjectContext(visitor);
    await this.repository.save(visitorWithPublisher);
    visitorWithPublisher.commit();
  }
}
```

### Consultar información de un visitante

```typescript
// Controller
@Controller('visitors')
export class VisitorsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':id')
  async getVisitor(@Param('id') id: string) {
    return this.queryBus.execute(new GetVisitorByIdQuery(id));
  }
}

// Query Handler
@QueryHandler(GetVisitorByIdQuery)
export class GetVisitorByIdHandler implements IQueryHandler<GetVisitorByIdQuery> {
  constructor(
    @Inject(VISITOR_REPOSITORY)
    private readonly repository: VisitorRepository,
  ) {}

  async execute(query: GetVisitorByIdQuery): Promise<VisitorDto> {
    const { id } = query;
    const visitorId = VisitorId.create(id);
    
    const visitor = await this.repository.findById(visitorId);
    if (!visitor) {
      throw new VisitorNotFoundError(id);
    }
    
    return VisitorMapper.toDto(visitor);
  }
}
```

## Intención

Permite gestionar la información y acciones de los visitantes de forma desacoplada, clara y escalable, facilitando la integración con otros contextos. Este diseño:

- Centraliza la gestión de la información de visitantes.
- Permite la integración con sistemas de autenticación.
- Facilita la personalización basada en perfiles.
- Proporciona una base sólida para implementar análisis de comportamiento.
