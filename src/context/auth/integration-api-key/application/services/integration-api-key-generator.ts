export const INTEGRATION_API_KEY_GENERATOR = 'INTEGRATION_API_KEY_GENERATOR';

export interface IntegrationApiKeyGenerator {
  /**
   * Genera un token en claro del formato gdr_live_<32 hex> o gdr_test_<32 hex>
   * y devuelve también el prefijo para mostrar (primeros 12 chars) y el hash para almacenar.
   */
  generate(environment: 'live' | 'test'): Promise<{
    plainToken: string;
    tokenPrefix: string;
    tokenHash: string;
  }>;
}
