import { PrimitiveValueObject } from '../../../../../shared/domain/primitive-value-object';

export class Content extends PrimitiveValueObject<string> {
  private constructor(value: string) {
    super(
      value,
      (v) => v.trim().length > 0,
      'El contenido no puede estar vacío',
    );
  }

  public static create(value: string): Content {
    return new Content(value);
  }
}
