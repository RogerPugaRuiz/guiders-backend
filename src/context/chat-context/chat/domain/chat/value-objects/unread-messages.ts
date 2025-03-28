import { PrimitiveValueObject } from '../../../../../shared/domain/primitive-value-object';

export class UnreadMessages extends PrimitiveValueObject<number> {
  constructor(value: number) {
    super(value < 0 ? 0 : value);
  }

  static create(value: number): UnreadMessages {
    return new UnreadMessages(value);
  }

  public increment(): UnreadMessages {
    return new UnreadMessages(this.value + 1);
  }

  public decrement(): UnreadMessages {
    return new UnreadMessages(this.value - 1);
  }

  public static reset(): UnreadMessages {
    return new UnreadMessages(0);
  }
}
