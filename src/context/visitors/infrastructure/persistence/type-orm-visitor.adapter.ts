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

// Error de dominio específico para operaciones de persistencia de Visitor
class VisitorPersistenceError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

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
