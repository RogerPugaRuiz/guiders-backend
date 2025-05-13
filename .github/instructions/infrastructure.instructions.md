---
applyTo: '**/*.ts'
---
# ROL/SISTEMA
Eres un experto en TypeScript y DDD.

# PREPARACIÓN
Antes de comenzar pregunta que se necesita crear en la infrastructura.
Si necesita crear un repositorio o servicio, sigue estos pasos:
  - Si ya existe la interfaz del repositorio/servicio y el símbolo para la inyección de dependencias. Si no existen, crea la interfaz y el símbolo. usando la guia de Guia de Dominio.
  - Pregunta el tipo de base de datos que se va a usar. Si es Postgres, crea el repositorio usando TypeORM. Si es MongoDB, crea el repositorio usando Mongoose.

# TAREAS
Crear servicios, repositorios y cualquier otra cosa que se necesite en la infraestructura.

# PASOS
Si necesita un repositorio, sigue estos pasos:
1. Crea la entidad de TypeORM o Mongoose. 
2. Genera la implementacion del repositorio.
3. Añade el repositorio al contenedor de dependencias.

# FORMATO
- **Ubicación de los archivos**: Los archivos deben estar en la carpeta `src/context/{context}/infrastructure/persistence/impl` para repositorios y `src/context/{context}/infrastructure/persistence/entity` para entidades.
- **Nombre de los archivos**: Deben seguir la convención de nombres de TypeScript, es decir, `nombre-del-repositorio.repository.impl.ts` para repositorios y `nombre-del-repositorio.entity.ts` para entidades.
- **Uso de CriteriaConverter**: Asegúrate de usar la clase `CriteriaConverter` para convertir los criterios de búsqueda en sentencias SQL.

- **Uso de mappers**: Utiliza mappers para convertir entre la entidad de dominio y la entidad de persistencia. Esto ayuda a mantener el código limpio y separado, los mappers tienen que ir en un archivo separado.
- **Inyección de dependencias**: Asegúrate de que el repositorio esté registrado en el contenedor de dependencias de NestJS.
  Ejemplo:
  ```typescript
  import { USER_REPOSITORY } from '../domain/user.repository';
  import { UserRepository } from './user.repository';
  import { UserRepositoryImpl } from './user.repository.impl';
  import { User } from '../domain/user.entity';

  export const userRepositoryProvider = {
    provide: USER_REPOSITORY,
    useClass: UserRepositoryImpl,
  };

  @Module({
    providers: [userRepositoryProvider],
  })
  export class UserModule {}
  ```

  # EJEMPLOS
  ## Repositorio de TypeORM
  ```typescript
  import { Injectable } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository } from 'typeorm';
  import { IVisitorRepository } from '../../domain/visitor.repository';
  import { Visitor } from '../../domain/visitor';
  import { VisitorId } from '../../domain/value-objects/visitor-id';
  import { Criteria } from 'src/context/shared/domain/criteria';
  import { DomainError } from 'src/context/shared/domain/domain.error';
  import { Result, ok, err, okVoid } from 'src/context/shared/domain/result';
  import { CriteriaConverter } from 'src/context/shared/infrastructure/criteria-converter/criteria-converter';
  import { VisitorMapper } from './mappers/visitor.mapper';
  // Asegúrate de crear esta entidad en infrastructure/persistence/visitor-typeorm.entity.ts
  import { VisitorTypeOrmEntity } from './visitor-typeorm.entity';

  @Injectable()
  export class TypeOrmVisitorAdapter implements IVisitorRepository {
    constructor(
      @InjectRepository(VisitorTypeOrmEntity)
      private readonly visitorRepository: Repository<VisitorTypeOrmEntity>,
    ) {}

    // Busca un Visitor por su ID
    async findById(visitorId: VisitorId): Promise<Result<Visitor, DomainError>> {
      try {
        const entity = await this.visitorRepository.findOne({
          where: { id: visitorId.value },
        });
        if (!entity) {
          return err(new VisitorPersistenceError('Visitor no encontrado'));
        }
        // Utiliza VisitorMapper para reconstruir la entidad de dominio
        const visitor = VisitorMapper.fromPersistence(entity);
        return ok(visitor);
      } catch (error) {
        return err(
          new VisitorPersistenceError(
            'Error al buscar Visitor: ' +
              (error instanceof Error ? error.message : String(error)),
          ),
        );
      }
    }

    // Busca Visitors según un Criteria usando CriteriaConverter y QueryBuilder
    async match(
      criteria: Criteria<Visitor>,
    ): Promise<Result<Visitor[], DomainError>> {
      try {
        // Mapeo de campos de dominio a columnas de base de datos
        const fieldNameMap = {
          id: 'id',
          name: 'name',
          email: 'email',
          tel: 'tel',
          tags: 'tags',
          notes: 'notes',
        };
        // Utiliza CriteriaConverter para construir la consulta SQL y los parámetros
        const { sql, parameters } = CriteriaConverter.toPostgresSql(
          criteria,
          'visitors',
          fieldNameMap,
        );
        // Utiliza QueryBuilder para mayor seguridad y flexibilidad
        const entities = await this.visitorRepository
          .createQueryBuilder('visitors')
          .where(sql.replace(/^WHERE /, ''))
          .setParameters(parameters)
          .getMany();
        // Utiliza VisitorMapper para mapear las entidades
        const visitors = entities.map((entity: VisitorTypeOrmEntity) =>
          VisitorMapper.fromPersistence(entity),
        );
        return ok(visitors);
      } catch (error) {
        return err(
          new VisitorPersistenceError(
            'Error al buscar Visitors: ' +
              (error instanceof Error ? error.message : String(error)),
          ),
        );
      }
    }

    // Persiste un Visitor en la base de datos
    async save(visitor: Visitor): Promise<Result<void, DomainError>> {
      try {
        // Utiliza VisitorMapper para convertir la entidad de dominio a persistencia
        const entity = VisitorMapper.toPersistence(visitor);
        await this.visitorRepository.save(entity);
        return okVoid();
      } catch (error) {
        return err(
          new VisitorPersistenceError(
            'Error al guardar Visitor: ' +
              (error instanceof Error ? error.message : String(error)),
          ),
        );
      }
    }
  }
  ```
## Entidad de TypeORM
```typescript
    const { sql, parameters } = CriteriaConverter.toPostgresSql(
    criteria,
    'message',
  );
  const entity = await this.messageRepository
    .createQueryBuilder('message')
    .where(sql.replace(/^WHERE /, '')) // Elimina el WHERE inicial porque TypeORM lo agrega
    .setParameters(parameters)
    .getOne();
```

## Ejemplo de uso de mapper
```typescript
const entity = VisitorMapper.toPersistence(visitor);
```