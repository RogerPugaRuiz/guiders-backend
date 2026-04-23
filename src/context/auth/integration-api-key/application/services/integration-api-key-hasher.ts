export const INTEGRATION_API_KEY_HASHER = 'INTEGRATION_API_KEY_HASHER';

export interface IntegrationApiKeyHasher {
  hash(value: string): Promise<string>;
}
