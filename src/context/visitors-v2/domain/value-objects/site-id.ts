import { Uuid } from '../../../shared/domain/value-objects/uuid';

/**
 * Value Object para el ID del sitio/site
 * Representa el sitio web específico donde está el visitante
 */
export class SiteId extends Uuid {
  constructor(value: string) {
    super(value);
  }

  public static random(): SiteId {
    return new SiteId(Uuid.generate());
  }
}
