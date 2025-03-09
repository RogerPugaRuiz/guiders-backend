import { ApiKey } from '../model/api-key';
export const API_KEY_REPOSITORY = 'API_KEY_REPOSITORY';
export interface ApiKeyRepository {
  save(apiKey: ApiKey): Promise<void>;
  getApiKeyByDomain(domain: string): Promise<ApiKey | null>;
  getAllApiKeys(): Promise<ApiKey[]>;
}
