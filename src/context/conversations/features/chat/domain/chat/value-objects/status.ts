import { PrimitiveValueObject } from '../../../../../shared/domain/primitive-value-object';

export class Status extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(value, (v) => {
      const validStatuses = [
        'active',
        'inactive',
        'closed',
        'archived',
        'pending',
      ];
      return typeof v === 'string' && validStatuses.includes(v);
    });
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
