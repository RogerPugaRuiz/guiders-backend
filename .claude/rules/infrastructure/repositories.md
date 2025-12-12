# Implementaciones de Repositorios

## Descripción

Implementaciones concretas de las interfaces de dominio usando ORMs (Mongoose/TypeORM).

## Referencia

`src/context/conversations-v2/infrastructure/persistence/impl/mongo-chat.repository.impl.ts`

## Implementación MongoDB (Mongoose)

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class MongoChatRepositoryImpl implements IChatRepository {
  constructor(
    @InjectModel(ChatSchema.name)
    private readonly chatModel: Model<ChatSchema>,
    private readonly chatMapper: ChatMapper,
  ) {}

  async save(chat: Chat): Promise<Result<void, DomainError>> {
    try {
      const schema = this.chatMapper.toSchema(chat);
      await this.chatModel.create(schema);
      return okVoid();
    } catch (error) {
      return err(new ChatPersistenceError(`Error al guardar: ${error.message}`));
    }
  }

  async findById(chatId: ChatId): Promise<Result<Chat, DomainError>> {
    try {
      const schema = await this.chatModel.findOne({ id: chatId.value });
      if (!schema) {
        return err(new ChatNotFoundError(chatId.value));
      }
      return ok(this.chatMapper.toDomain(schema));
    } catch (error) {
      return err(new ChatPersistenceError(`Error: ${error.message}`));
    }
  }

  async match(criteria: Criteria<Chat>): Promise<Result<Chat[], DomainError>> {
    try {
      const filter = this.buildMongoFilter(criteria);
      const options = this.buildMongoOptions(criteria);

      const schemas = await this.chatModel.find(filter, null, options);
      return ok(this.chatMapper.toDomainList(schemas));
    } catch (error) {
      return err(new ChatPersistenceError(`Error: ${error.message}`));
    }
  }

  private buildMongoFilter(criteria: Criteria<Chat>): Record<string, unknown> {
    const filter: Record<string, unknown> = {};

    for (const f of criteria.filters) {
      switch (f.operator) {
        case Operator.EQUALS:
          filter[f.field as string] = f.value;
          break;
        case Operator.IN:
          filter[f.field as string] = { $in: f.value };
          break;
        case Operator.GREATER_THAN:
          filter[f.field as string] = { $gt: f.value };
          break;
        case Operator.LIKE:
          filter[f.field as string] = { $regex: f.value, $options: 'i' };
          break;
      }
    }

    return filter;
  }
}
```

## Implementación TypeORM

```typescript
@Injectable()
export class CompanyRepositoryTypeOrmImpl implements CompanyRepository {
  constructor(
    @InjectRepository(CompanyTypeOrmEntity)
    private readonly companyRepo: Repository<CompanyTypeOrmEntity>,
  ) {}

  async save(company: Company): Promise<Result<void, DomainError>> {
    try {
      const entity = CompanyMapper.toPersistence(company);
      await this.companyRepo.save(entity);
      return okVoid();
    } catch (error) {
      return err(new CompanyPersistenceError(error.message));
    }
  }

  async match(criteria: Criteria<Company>): Promise<Result<Company[], DomainError>> {
    try {
      const fieldNameMap = {
        id: 'id',
        companyName: 'company_name',
        createdAt: 'created_at',
      };

      const { sql, parameters } = CriteriaConverter.toPostgresSql(
        criteria,
        'companies',
        fieldNameMap,
      );

      const entities = await this.companyRepo
        .createQueryBuilder('companies')
        .where(sql.replace(/^WHERE /, ''))
        .setParameters(parameters)
        .getMany();

      return ok(entities.map(CompanyMapper.toDomain));
    } catch (error) {
      return err(new CompanyPersistenceError(error.message));
    }
  }
}
```

## Mapper Pattern

```typescript
@Injectable()
export class ChatMapper {
  // Dominio → Persistencia
  toSchema(chat: Chat): ChatSchema {
    const schema = new ChatSchema();
    const primitives = chat.toPrimitives();

    schema.id = primitives.id;
    schema.status = primitives.status;
    schema.visitorId = primitives.visitorId;
    schema.createdAt = primitives.createdAt;

    return schema;
  }

  // Persistencia → Dominio
  toDomain(schema: ChatSchema): Chat {
    return Chat.fromPrimitives({
      id: schema.id,
      status: schema.status,
      visitorId: schema.visitorId,
      createdAt: schema.createdAt,
    });
  }

  // Lista
  toDomainList(schemas: ChatSchema[]): Chat[] {
    return schemas.map(s => this.toDomain(s));
  }
}
```

## Registro en Módulo

```typescript
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatSchema.name, schema: ChatSchemaDefinition },
    ]),
  ],
  providers: [
    ChatMapper,
    {
      provide: CHAT_REPOSITORY,
      useClass: MongoChatRepositoryImpl,
    },
  ],
  exports: [CHAT_REPOSITORY],
})
export class ChatInfrastructureModule {}
```

## Reglas de Naming

| Elemento | Patrón | Ejemplo |
|----------|--------|---------|
| Impl Mongo | `Mongo<Entity>RepositoryImpl` | `MongoChatRepositoryImpl` |
| Impl TypeORM | `<Entity>RepositoryTypeOrmImpl` | `CompanyRepositoryTypeOrmImpl` |
| Mapper | `<Entity>Mapper` | `ChatMapper` |
| Ubicación | `infrastructure/persistence/impl/` | - |

## Anti-patrones

- Exponer schemas/entities fuera de infrastructure
- SQL concatenado manualmente
- Olvidar mapear a/desde dominio
- No usar try/catch con Result
