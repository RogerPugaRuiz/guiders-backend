// jwks.service.ts
import { Injectable } from '@nestjs/common';
import { Key } from './jwks-key';
import { GetAllApiKeysUseCase } from '../application/usecase/get-all-api-keys.usecase';
import { createPublicKey } from 'crypto';

export interface JwksResponse {
  keys: Key[];
}

@Injectable()
export class JwksService {
  constructor(private readonly getAllApiKeysUseCase: GetAllApiKeysUseCase) {}

  async getJwks(): Promise<JwksResponse> {
    const apiKeys = await this.getAllApiKeysUseCase.execute();

    const keys: Key[] = apiKeys.map((apiKey) => {
      // Convertimos PEM a JWK, y extraemos n y e
      const publicKey = createPublicKey(apiKey.publicKey);
      const jwk = publicKey.export({ format: 'jwk' }) as {
        n: string;
        e: string;
      };

      return {
        kty: 'RSA',
        kid: apiKey.kid,
        use: 'sig',
        alg: 'RS256',
        n: jwk.n,
        e: jwk.e,
      };
    });

    return { keys };
  }
}
