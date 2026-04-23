import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export type IntegrationApiKeyStatusValue = 'active' | 'revoked';

export class IntegrationApiKeyStatus extends PrimitiveValueObject<IntegrationApiKeyStatusValue> {
  public static readonly ACTIVE = new IntegrationApiKeyStatus('active');
  public static readonly REVOKED = new IntegrationApiKeyStatus('revoked');

  constructor(value: IntegrationApiKeyStatusValue) {
    super(
      value,
      (v) => v === 'active' || v === 'revoked',
      'El estado debe ser active o revoked',
    );
  }

  public static of(value: string): IntegrationApiKeyStatus {
    if (value !== 'active' && value !== 'revoked') {
      throw new Error('El estado debe ser active o revoked');
    }
    return new IntegrationApiKeyStatus(value as IntegrationApiKeyStatusValue);
  }

  public isActive(): boolean {
    return this.value === 'active';
  }

  public isRevoked(): boolean {
    return this.value === 'revoked';
  }
}
