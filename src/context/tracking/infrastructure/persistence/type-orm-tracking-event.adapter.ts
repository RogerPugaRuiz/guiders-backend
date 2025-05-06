import { Injectable } from '@nestjs/common';
import { ITrackingEventRepository } from '../../domain/tracking-event.repository';
import { Criteria } from 'src/context/shared/domain/criteria';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { Optional } from 'src/context/shared/domain/optional';
import { Result, ok, err, okVoid } from 'src/context/shared/domain/result';
import { TrackingEvent } from '../../domain/tracking-event';
import { TrackingEventId } from '../../domain/value-objects/tracking-event-id';
import { InjectRepository } from '@nestjs/typeorm';
import { TrackingEventTypeOrmEntity } from './tracking-event.typeorm.entity';
import { Repository } from 'typeorm';
import { CriteriaConverter } from 'src/context/shared/infrastructure/criteria-converter/criteria-converter';

// Error de dominio específico para operaciones de persistencia
class TrackingEventPersistenceError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

@Injectable()
export class TypeOrmTrackingEventAdapter implements ITrackingEventRepository {
  constructor(
    @InjectRepository(TrackingEventTypeOrmEntity)
    private readonly trackingEventRepository: Repository<TrackingEventTypeOrmEntity>,
  ) {}

  // Busca un TrackingEvent por su ID
  async find(
    id: TrackingEventId,
  ): Promise<Result<Optional<TrackingEvent>, DomainError>> {
    try {
      const entity = await this.trackingEventRepository.findOne({
        where: { id: id.value },
      });
      if (!entity) {
        return ok(Optional.empty<TrackingEvent>());
      }
      // Reconstruye la entidad de dominio desde la entidad de infraestructura
      const event = TrackingEvent.fromPrimitives({
        id: entity.id,
        visitorId: entity.visitorId,
        eventType: entity.eventType,
        metadata: entity.metadata,
        occurredAt: entity.occurredAt,
      });
      return ok(Optional.of(event));
    } catch (error) {
      return err(
        new TrackingEventPersistenceError(
          'Error al buscar TrackingEvent: ' +
            (error instanceof Error ? error.message : String(error)),
        ),
      );
    }
  }

  // Busca TrackingEvents según un Criteria usando CriteriaConverter y QueryBuilder
  async match(
    criteria: Criteria<TrackingEvent>,
  ): Promise<Result<TrackingEvent[], DomainError>> {
    try {
      // Mapeo de campos de dominio a columnas de base de datos
      const fieldNameMap = {
        id: 'id',
        visitorId: 'visitorId',
        eventType: 'eventType',
        metadata: 'metadata',
        occurredAt: 'occurredAt',
      };
      // Utiliza CriteriaConverter para construir la consulta SQL y los parámetros
      const { sql, parameters } = CriteriaConverter.toPostgresSql(
        criteria,
        'tracking_events',
        fieldNameMap,
      );
      // Utiliza QueryBuilder para mayor seguridad y flexibilidad
      const entities = await this.trackingEventRepository
        .createQueryBuilder('tracking_events')
        .where(sql.replace(/^WHERE /, ''))
        .setParameters(parameters)
        .getMany();
      // Mapea las entidades de infraestructura a entidades de dominio
      const events = entities.map((entity: TrackingEventTypeOrmEntity) =>
        TrackingEvent.fromPrimitives({
          id: entity.id,
          visitorId: entity.visitorId,
          eventType: entity.eventType,
          metadata: entity.metadata,
          occurredAt: entity.occurredAt,
        }),
      );
      return ok(events);
    } catch (error) {
      return err(
        new TrackingEventPersistenceError(
          'Error al buscar TrackingEvents: ' +
            (error instanceof Error ? error.message : String(error)),
        ),
      );
    }
  }

  // Persiste un TrackingEvent en la base de datos
  async save(event: TrackingEvent): Promise<Result<void, DomainError>> {
    try {
      const primitives = event.toPrimitives();
      const entity = this.trackingEventRepository.create({
        id: primitives.id,
        visitorId: primitives.visitorId,
        eventType: primitives.eventType,
        metadata: primitives.metadata,
        occurredAt: primitives.occurredAt,
      });
      await this.trackingEventRepository.save(entity);
      return okVoid();
    } catch (error) {
      return err(
        new TrackingEventPersistenceError(
          'Error al guardar TrackingEvent: ' +
            (error instanceof Error ? error.message : String(error)),
        ),
      );
    }
  }
}
