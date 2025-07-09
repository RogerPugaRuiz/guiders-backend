import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

export class ComercialClaimId extends Uuid {
  constructor(value: string) {
    super(value);
  }

  static random(): ComercialClaimId {
    return new ComercialClaimId(Uuid.generate());
  }
}
