import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export type IntegrationApiKeyEnvironmentValue = 'live' | 'test';

export class IntegrationApiKeyEnvironment extends PrimitiveValueObject<IntegrationApiKeyEnvironmentValue> {
  public static readonly LIVE = new IntegrationApiKeyEnvironment('live');
  public static readonly TEST = new IntegrationApiKeyEnvironment('test');

  private constructor(value: IntegrationApiKeyEnvironmentValue) {
    super(value, (v) => v === 'live' || v === 'test', 'El entorno debe ser live o test');
  }

  public static create(value: string): IntegrationApiKeyEnvironment {
    if (value !== 'live' && value !== 'test') {
      throw new Error('El entorno debe ser live o test');
    }
    return new IntegrationApiKeyEnvironment(value as IntegrationApiKeyEnvironmentValue);
  }

  public isLive(): boolean {
    return this.value === 'live';
  }

  public isTest(): boolean {
    return this.value === 'test';
  }
}
