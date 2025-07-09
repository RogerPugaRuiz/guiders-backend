import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class ClaimStatus extends PrimitiveValueObject<string> {
  static readonly ACTIVE = 'active';
  static readonly RELEASED = 'released';

  constructor(value: string) {
    super(value);
  }

  static active(): ClaimStatus {
    return new ClaimStatus(ClaimStatus.ACTIVE);
  }

  static released(): ClaimStatus {
    return new ClaimStatus(ClaimStatus.RELEASED);
  }

  isActive(): boolean {
    return this.value === ClaimStatus.ACTIVE;
  }

  isReleased(): boolean {
    return this.value === ClaimStatus.RELEASED;
  }
}
