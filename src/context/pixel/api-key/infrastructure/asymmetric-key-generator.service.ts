import { Injectable } from '@nestjs/common';
import { generateKeyPairSync } from 'crypto';
import { ApiKeyGenerateKeys } from '../application/services/api-key-generate-keys';

@Injectable()
export class AsymmetricKeyGeneratorService implements ApiKeyGenerateKeys {
  generate(): Promise<{ privateKey: string; publicKey: string }> {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });
    return Promise.resolve({ privateKey, publicKey });
  }
}
