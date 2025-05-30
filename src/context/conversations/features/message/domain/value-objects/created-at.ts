import { ValidationError } from 'src/context/shared/domain/validation.error';
import { PrimitiveValueObject } from '../../../../shared/domain/primitive-value-object';

export class CreatedAt extends PrimitiveValueObject<Date> {
  /**
   * Recibe un valor Date, string o number y valida que sea una fecha válida.
   */
  constructor(value: Date | string | number) {
    let dateValue: Date;
    if (value instanceof Date) {
      dateValue = value;
    } else {
      dateValue = new Date(value);
    }
    if (!(dateValue instanceof Date) || isNaN(dateValue.getTime())) {
      throw new ValidationError('Fecha inválida');
    }
    super(dateValue);
  }

  public static now(): CreatedAt {
    return new CreatedAt(new Date());
  }
}
