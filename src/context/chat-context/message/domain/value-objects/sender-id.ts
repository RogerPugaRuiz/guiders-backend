import { UuidValueObject } from '../../../../shared/domain/uuid-value-object';

export class SenderId extends UuidValueObject {
  private constructor(value: string) {
    super(value);
  }

  public static create(value?: string): SenderId {
    if (value) {
      return new SenderId(value);
    }
    return new SenderId(UuidValueObject.generate());
  }
}
