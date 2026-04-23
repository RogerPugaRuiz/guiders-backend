import { Injectable } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { IntegrationApiKeyGenerator } from '../application/services/integration-api-key-generator';

/**
 * Genera tokens del formato gdr_live_<32 hex> o gdr_test_<32 hex>
 * usando crypto.randomBytes para seguridad criptográfica.
 * El hash se almacena en base de datos; el token en claro solo se devuelve una vez.
 */
@Injectable()
export class IntegrationApiKeyGeneratorService
  implements IntegrationApiKeyGenerator
{
  generate(environment: 'live' | 'test'): Promise<{
    plainToken: string;
    tokenPrefix: string;
    tokenHash: string;
  }> {
    const randomPart = randomBytes(16).toString('hex'); // 32 chars hex
    const plainToken = `gdr_${environment}_${randomPart}`;
    // El prefijo muestra los primeros 16 chars del token (sin el valor aleatorio)
    const tokenPrefix = `gdr_${environment}_${randomPart.substring(0, 4)}...`;
    const tokenHash = createHash('sha256').update(plainToken).digest('hex');

    return Promise.resolve({ plainToken, tokenPrefix, tokenHash });
  }
}
