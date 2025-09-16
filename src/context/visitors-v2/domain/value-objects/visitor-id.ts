import { Uuid } from '../../../shared/domain/value-objects/uuid';

/**
 * Value Object para el ID único del visitante
 */
export class VisitorId extends Uuid {
  constructor(value: string) {
    super(value);
  }

  public static random(): VisitorId {
    return new VisitorId(Uuid.generate());
  }
}
