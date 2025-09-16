import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IIntentDetectorRepository } from 'src/context/tracking/domain/intent-detector.repository';
import { VisitorIntent } from 'src/context/tracking/domain/visitor-intent.aggregate';
import { VisitorId } from 'src/context/tracking/domain/value-objects/visitor-id';
import { VisitorIntentEntity } from '../entity/visitor-intent.entity';
import { VisitorIntentTypeOrmMapper } from '../visitor-intent.typeorm-mapper';
import { Criteria } from 'src/context/shared/domain/criteria';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { Result, ok, err, okVoid } from 'src/context/shared/domain/result';
import { CriteriaConverter } from 'src/context/shared/infrastructure/criteria-converter/criteria-converter';

// Error de dominio específico para operaciones de persistencia
class VisitorIntentPersistenceError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

@Injectable()
export class VisitorIntentRepositoryImpl implements IIntentDetectorRepository {
  constructor(
    @InjectRepository(VisitorIntentEntity)
    private readonly repo: Repository<VisitorIntentEntity>,
  ) {}

  async save(intent: VisitorIntent): Promise<Result<void, DomainError>> {
    try {
      const entity = VisitorIntentTypeOrmMapper.toPersistence(intent);
      await this.repo.save(entity);
      return okVoid();
    } catch (error) {
      return err(
        new VisitorIntentPersistenceError(
          'Error al guardar VisitorIntent: ' +
            (error instanceof Error ? error.message : String(error)),
        ),
      );
    }
  }

  async findById(id: string): Promise<Result<VisitorIntent, DomainError>> {
    try {
      const entity = await this.repo.findOne({ where: { id } });
      if (!entity) {
        return err(
          new VisitorIntentPersistenceError('VisitorIntent no encontrado'),
        );
      }
      return ok(VisitorIntentTypeOrmMapper.fromPersistence(entity));
    } catch (error) {
      return err(
        new VisitorIntentPersistenceError(
          'Error al buscar VisitorIntent: ' +
            (error instanceof Error ? error.message : String(error)),
        ),
      );
    }
  }

  async findAll(): Promise<Result<VisitorIntent[], DomainError>> {
    try {
      const entities = await this.repo.find();
      // Usar arrow function multilínea para evitar problemas de this y cumplir con el linter
      return ok(
        entities.map((entity) =>
          VisitorIntentTypeOrmMapper.fromPersistence(entity),
        ),
      );
    } catch (error) {
      return err(
        new VisitorIntentPersistenceError(
          'Error al buscar VisitorIntents: ' +
            (error instanceof Error ? error.message : String(error)),
        ),
      );
    }
  }

  async delete(id: string): Promise<Result<void, DomainError>> {
    try {
      await this.repo.delete(id);
      return okVoid();
    } catch (error) {
      return err(
        new VisitorIntentPersistenceError(
          'Error al eliminar VisitorIntent: ' +
            (error instanceof Error ? error.message : String(error)),
        ),
      );
    }
  }

  async update(intent: VisitorIntent): Promise<Result<void, DomainError>> {
    try {
      const entity = VisitorIntentTypeOrmMapper.toPersistence(intent);
      await this.repo.save(entity);
      return okVoid();
    } catch (error) {
      return err(
        new VisitorIntentPersistenceError(
          'Error al actualizar VisitorIntent: ' +
            (error instanceof Error ? error.message : String(error)),
        ),
      );
    }
  }

  async findOne(
    visitorId: VisitorId,
  ): Promise<Result<VisitorIntent, DomainError>> {
    try {
      const entity = await this.repo.findOne({
        where: { visitorId: visitorId.value },
        order: { detectedAt: 'DESC' },
      });
      if (!entity) {
        return err(
          new VisitorIntentPersistenceError(
            'VisitorIntent no encontrado para visitorId',
          ),
        );
      }
      return ok(VisitorIntentTypeOrmMapper.fromPersistence(entity));
    } catch (error) {
      return err(
        new VisitorIntentPersistenceError(
          'Error al buscar VisitorIntent por visitorId: ' +
            (error instanceof Error ? error.message : String(error)),
        ),
      );
    }
  }

  async match(
    criteria: Criteria<VisitorIntent>,
  ): Promise<Result<VisitorIntent[], DomainError>> {
    try {
      const fieldNameMap = {
        id: 'id',
        visitorId: 'visitorId',
        type: 'type',
        confidence: 'confidence',
        detectedAt: 'detectedAt',
      };
      const { sql, parameters } = CriteriaConverter.toPostgresSql(
        criteria,
        'visitor_intent',
        fieldNameMap,
      );
      const entities = await this.repo
        .createQueryBuilder('visitor_intent')
        .where(sql.replace(/^WHERE /, ''))
        .setParameters(parameters)
        .getMany();
      // Usar arrow function multilínea para evitar problemas de this y cumplir con el linter
      return ok(
        entities.map((entity) =>
          VisitorIntentTypeOrmMapper.fromPersistence(entity),
        ),
      );
    } catch (error) {
      return err(
        new VisitorIntentPersistenceError(
          'Error al buscar VisitorIntents por criteria: ' +
            (error instanceof Error ? error.message : String(error)),
        ),
      );
    }
  }
}
