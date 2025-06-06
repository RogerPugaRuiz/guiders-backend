import { TrackingEvent } from './tracking-event';
import { TrackingEventId } from './value-objects/tracking-event-id';
import { Criteria } from 'src/context/shared/domain/criteria';
import { Result } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
export const TRACKING_EVENT_REPOSITORY = Symbol('TrackingEventRepository');
// Repositorio de TrackingEvent siguiendo DDD y CQRS
export interface ITrackingEventRepository {
  /**
   * Busca un único TrackingEvent por su identificador.
   * @returns Devuelve un Result con el TrackingEvent o un DomainError.
   * @param id Identificador del TrackingEvent.
   */
  findById(id: TrackingEventId): Promise<Result<TrackingEvent, DomainError>>;

  /**
   * Busca TrackingEvents en el repositorio según criterios.
   * @returns Devuelve un Result con un array de TrackingEvent o un DomainError.
   * @param criteria Criterios de búsqueda.
   */
  match(
    criteria: Criteria<TrackingEvent>,
  ): Promise<Result<TrackingEvent[], DomainError>>;

  /**
   * Persiste un TrackingEvent en el repositorio.
   * @returns Devuelve un Result vacío o un DomainError.
   * @param event Evento de seguimiento a guardar.
   */
  save(event: TrackingEvent): Promise<Result<void, DomainError>>;
}
