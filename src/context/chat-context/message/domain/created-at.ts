import { PrimitiveValueObject } from '../../../shared/domain/primitive-value-object';

export class CreatedAt extends PrimitiveValueObject<Date> {
  private constructor(value: Date) {
    super(
      value,
      (v) => v instanceof Date && !isNaN(v.getTime()),
      'Fecha inválida',
    );
  }

  public static create(value: Date): CreatedAt {
    return new CreatedAt(value);
  }

  public static now(): CreatedAt {
    return new CreatedAt(new Date());
  }
}
