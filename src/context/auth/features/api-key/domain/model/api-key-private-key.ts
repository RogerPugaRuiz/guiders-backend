import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class ApiKeyPrivateKey extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(value);
  }

  async encrypt(
    encryptor: (value: string) => Promise<string>,
  ): Promise<ApiKeyPrivateKey> {
    return encryptor(this.value).then((encryptedValue) => {
      return new ApiKeyPrivateKey(encryptedValue);
    });
  }
}
