import { Uuid } from '../../../shared/domain/value-objects/uuid';

/**
 * Value Object para el identificador único de un consentimiento
 */
export class ConsentId extends Uuid {
  constructor(value: string) {
    super(value);
  }

  /**
   * Genera un nuevo ConsentId aleatorio
   */
  public static random(): ConsentId {
    return new ConsentId(Uuid.generate());
  }
}
