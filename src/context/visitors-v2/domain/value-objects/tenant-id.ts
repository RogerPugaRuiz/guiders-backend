import { Uuid } from '../../../shared/domain/value-objects/uuid';

/**
 * Value Object para el ID del tenant/inquilino
 * Representa la organización o empresa a la que pertenece el visitante
 */
export class TenantId extends Uuid {
  constructor(value: string) {
    super(value);
  }

  public static random(): TenantId {
    return new TenantId(Uuid.generate());
  }
}
