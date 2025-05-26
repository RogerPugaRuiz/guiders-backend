# Contexto Company

Este contexto gestiona la lógica relacionada con compañías, aplicando DDD y CQRS con NestJS v11 y @nestjs/cqrs.

## Estructura

- **application/**: Lógica de aplicación (commands, events, queries, dtos).
  - **commands/**: Comandos para gestionar compañías.
  - **events/**: Manejadores de eventos relacionados con compañías.
  - **queries/**: Consultas para obtener información de compañías.
  - **dtos/**: Objetos de transferencia de datos.
- **domain/**: Entidades, repositorios, eventos y value objects del dominio de compañías.
  - **models/**: Entidades como Company, Commercial, ApiKey.
  - **repositories/**: Interfaces de repositorios para compañías.
  - **events/**: Eventos de dominio específicos de compañías.
- **infrastructure/**: Adaptadores, persistencia y controladores.
  - **controllers/**: API REST para operaciones con compañías.
  - **repositories/**: Implementaciones de repositorios con TypeORM.
  - **persistence/**: Entidades ORM y mappers.

## Principios

- **DDD**: El dominio modela las reglas y procesos de negocio de compañías.
- **CQRS**: Comandos y queries separados para claridad y escalabilidad.
- **Eventos**: Los cambios importantes generan eventos manejados por EventHandlers.

## Componentes principales

### Agregados y entidades

- **Company**: Agregado raíz que representa una empresa cliente.
- **Commercial**: Usuario con rol de comercial perteneciente a una compañía.
- **ApiKey**: Clave de API que identifica a una compañía en el sistema.

### Value Objects principales

```typescript
export class CompanyId {
  private constructor(private readonly value: Uuid) {}

  static create(value?: string): CompanyId {
    return new CompanyId(Uuid.create(value));
  }

  toString(): string {
    return this.value.toString();
  }
}

export class CompanyName {
  private constructor(private readonly value: string) {}

  static create(value: string): CompanyName {
    if (!value || value.trim().length < 2) {
      throw new InvalidCompanyNameError(value);
    }
    return new CompanyName(value.trim());
  }

  get value(): string {
    return this.value;
  }
}
```

## Flujos principales

### Creación de una compañía

```
┌───────────┐     ┌─────────────────┐     ┌──────────────────┐
│   Admin   │────▶│  Controller     │────▶│CreateCompanyCmd  │
└───────────┘     └─────────────────┘     └──────────────────┘
                                                   │
                                                   ▼
┌───────────────┐     ┌─────────────────┐     ┌──────────────────┐
│EventHandlers  │◀────│CompanyCreated   │◀────│  CompanyEntity   │
└───────────────┘     └─────────────────┘     └──────────────────┘
                        │                              │
                        │                              ▼
                        │                     ┌──────────────────┐
                        └────────────────────▶│ Generar API Key │
                                              └──────────────────┘
```

1. El administrador envía información para crear una compañía.
2. El controller recibe la petición y crea un comando.
3. El CommandHandler procesa el comando y crea la Company.
4. Se guarda la entidad y se emiten eventos de dominio.
5. Los EventHandlers reaccionan generando una API key para la compañía.

### Gestión de comerciales

```typescript
// Agregar un comercial a una compañía
@CommandHandler(AddCommercialToCompanyCommand)
export class AddCommercialToCompanyHandler implements ICommandHandler<AddCommercialToCompanyCommand> {
  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly repository: CompanyRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: AddCommercialToCompanyCommand): Promise<void> {
    const { companyId, commercialId, name, email, role } = command;
    
    const company = await this.repository.findById(CompanyId.create(companyId));
    if (!company) {
      throw new CompanyNotFoundError(companyId);
    }
    
    const commercial = Commercial.create({
      id: commercialId,
      name: CommercialName.create(name),
      email: CommercialEmail.create(email),
      role: CommercialRole.create(role),
    });
    
    company.addCommercial(commercial);
    
    const companyWithPublisher = this.publisher.mergeObjectContext(company);
    await this.repository.save(companyWithPublisher);
    companyWithPublisher.commit();
  }
}
```

## Ejemplos de uso

### Crear una compañía

```typescript
// Controller
@Controller('companies')
export class CompanyController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async createCompany(@Body() dto: CreateCompanyDto) {
    const companyId = await this.commandBus.execute(
      new CreateCompanyCommand({
        name: dto.name,
        domain: dto.domain,
        settings: dto.settings,
      }),
    );
    
    return { id: companyId };
  }
}
```

### Consultar datos de una compañía

```typescript
@Controller('companies')
export class CompanyController {
  constructor(private readonly queryBus: QueryBus) {}
  
  @Get(':id')
  async getCompany(@Param('id') id: string) {
    return this.queryBus.execute(new GetCompanyByIdQuery(id));
  }
}

@QueryHandler(GetCompanyByIdQuery)
export class GetCompanyByIdHandler implements IQueryHandler<GetCompanyByIdQuery> {
  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly repository: CompanyRepository,
  ) {}

  async execute(query: GetCompanyByIdQuery): Promise<CompanyDto> {
    const { id } = query;
    const companyId = CompanyId.create(id);
    
    const company = await this.repository.findById(companyId);
    if (!company) {
      throw new CompanyNotFoundError(id);
    }
    
    return CompanyMapper.toDto(company);
  }
}
```

### Validación de dominio y API key

```typescript
@Injectable()
export class ValidateDomainApiKeyService {
  constructor(
    @Inject(API_KEY_REPOSITORY)
    private readonly repository: ApiKeyRepository,
  ) {}
  
  async validate(params: { apiKey: string; domain: string }): Promise<boolean> {
    const apiKey = await this.repository.findByKey(params.apiKey);
    if (!apiKey) {
      return false;
    }
    
    // Verificar si el dominio está en la lista de dominios permitidos
    return apiKey.isValidForDomain(params.domain);
  }
}
```

## Intención

Permite mantener y evolucionar la lógica de compañías de forma desacoplada, clara y escalable, facilitando la integración con otros contextos. Este diseño:

- Centraliza la gestión de datos de compañías.
- Facilita la administración de comerciales y sus permisos.
- Permite la validación de API keys y dominios.
- Proporciona una base sólida para implementar funcionalidades específicas por compañía.
