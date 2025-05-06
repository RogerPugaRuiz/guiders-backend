import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class ApiKeyDomain extends PrimitiveValueObject<string> {
  private constructor(value: string) {
    super(
      value,
      (value: string) => {
        const regex = new RegExp(/^[a-zA-Z0-9._-]+$/);
        return regex.test(value);
      },
      'Invalid API key domain format',
    );
  }

  static create(value: string): ApiKeyDomain {
    return new ApiKeyDomain(value);
  }
}
