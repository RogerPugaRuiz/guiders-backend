import { ApiKey } from '../model/api-key';
import { ApiKeyDomain } from '../model/api-key-domain';
import { ApiKeyValue } from '../model/api-key-value';
export const API_KEY_REPOSITORY = 'API_KEY_REPOSITORY';
export interface ApiKeyRepository {
  save(apiKey: ApiKey): Promise<void>;
  getApiKeyByDomain(domain: ApiKeyDomain): Promise<ApiKey | null>;
  getApiKeyByApiKey(apiKey: ApiKeyValue): Promise<ApiKey | null>;
  getAllApiKeys(): Promise<ApiKey[]>;
}
