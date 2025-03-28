import { ValidationError } from 'src/context/shared/domain/validation.error';
import { PrimitiveValueObject } from '../../../../../shared/domain/primitive-value-object';

export class CreatedAt extends PrimitiveValueObject<Date> {
  private constructor(value: Date) {
    super(
      value,
      (v) => v instanceof Date && !isNaN(v.getTime()),
      'Fecha inválida',
    );
  }

  public static create(value: number | Date | string): CreatedAt {
    if (typeof value === 'number') {
      try {
        return new CreatedAt(new Date(value));
      } catch (error) {
        throw new ValidationError(`Fecha inválida: ${value}`);
      }
    }
    if (typeof value === 'string') {
      try {
        return new CreatedAt(new Date(value));
      } catch (error) {
        throw new ValidationError(`Fecha inválida: ${value}`);
      }
    }

    return new CreatedAt(value);
  }

  public static now(): CreatedAt {
    return new CreatedAt(new Date());
  }
}
