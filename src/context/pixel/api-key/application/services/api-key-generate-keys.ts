export const API_KEY_GENERATE_KEYS = 'ApiKeyGenerateKeys';
export interface ApiKeyGenerateKeys {
  generate(): Promise<{
    publicKey: string;
    privateKey: string;
  }>;
}
