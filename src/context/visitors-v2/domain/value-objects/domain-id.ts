import { Uuid } from '../../../shared/domain/value-objects/uuid';

/**
 * Value Object para el ID del dominio asociado al visitante
 * Representa la web/comercial donde está el visitante
 */
export class DomainId extends Uuid {
  constructor(value: string) {
    super(value);
  }

  public static random(): DomainId {
    return new DomainId(Uuid.generate());
  }
}
