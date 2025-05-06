import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class ApiKeyPrivateKey extends PrimitiveValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): ApiKeyPrivateKey {
    return new ApiKeyPrivateKey(value);
  }

  async encrypt(
    encryptor: (value: string) => Promise<string>,
  ): Promise<ApiKeyPrivateKey> {
    return encryptor(this.value).then((encryptedValue) => {
      return ApiKeyPrivateKey.create(encryptedValue);
    });
  }
}
