import { PrimitiveValueObject } from '../../../../../shared/domain/primitive-value-object';

export class Status extends PrimitiveValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  public static create(value: string): Status {
    // Validar el valor del estado
    const validStatuses = [
      'active',
      'inactive',
      'closed',
      'archived',
      'pending',
    ];
    if (!validStatuses.includes(value)) {
      throw new Error('Invalid status value');
    }
    return new Status(value);
  }

  public static get DEFAULT(): Status {
    return new Status('pending');
  }

  public static get ACTIVE(): Status {
    return new Status('active');
  }
  public static get INACTIVE(): Status {
    return new Status('inactive');
  }
  public static get CLOSED(): Status {
    return new Status('closed');
  }
  public static get ARCHIVED(): Status {
    return new Status('archived');
  }
  public static get PENDING(): Status {
    return new Status('pending');
  }
}
