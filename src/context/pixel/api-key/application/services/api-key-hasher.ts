export const API_KEY_HASHER = 'ApiKeyHasher';
export interface ApiKeyHasher {
  hash(plainText: string): Promise<string>;
  compare(plainText: string, hashed: string): Promise<boolean>;
}
