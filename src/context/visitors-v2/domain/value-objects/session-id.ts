import { Uuid } from '../../../shared/domain/value-objects/uuid';

/**
 * Value Object para el ID único de una sesión
 */
export class SessionId extends Uuid {
  constructor(value: string) {
    super(value);
  }

  public static random(): SessionId {
    return new SessionId(Uuid.generate());
  }
}
