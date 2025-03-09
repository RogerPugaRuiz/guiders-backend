import { Injectable } from '@nestjs/common';
import { Key } from './jwks-key';
import { GetAllApiKeysUseCase } from '../application/usecase/get-all-api-keys.usecase';

@Injectable()
export class JwksService {
  constructor(private readonly getAllApiKeysUseCase: GetAllApiKeysUseCase) {}
  async getJwks(): Promise<Key[]> {
    const apiKeys = await this.getAllApiKeysUseCase.execute();
    return apiKeys.map((apiKey) => ({
      kty: 'RSA',
      kid: apiKey.kid,
      use: 'sig',
      alg: 'RS256',
      n: this.convertToBase64Url(apiKey.publicKey),
      e: 'AQAB',
    }));
  }

  private convertToBase64Url(pemKey: string): string {
    const keyData = pemKey.replace(
      /(-----(BEGIN|END) PUBLIC KEY-----|\n)/g,
      '',
    );
    return Buffer.from(keyData, 'base64').toString('base64url');
  }
}
