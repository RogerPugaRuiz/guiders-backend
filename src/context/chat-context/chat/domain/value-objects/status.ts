import { PrimitiveValueObject } from '../../../../shared/domain/primitive-value-object';

export class Status extends PrimitiveValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  public static create(value: string): Status {
    // Validar el valor del estado
    const validStatuses = ['new', 'in progress', 'closed'];
    if (!validStatuses.includes(value)) {
      throw new Error('Invalid status value');
    }
    return new Status(value);
  }

  public static new(): Status {
    return new Status('new');
  }

  public static inProgress(): Status {
    return new Status('in progress');
  }

  public static closed(): Status {
    return new Status('closed');
  }
}
