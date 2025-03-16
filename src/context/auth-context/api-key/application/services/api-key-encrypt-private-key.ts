export const API_KEY_ENCRYPT_PRIVATE_KEY = 'ApiKeyEncryptPrivateKey';
export interface ApiKeyEncryptPrivateKey {
  encrypt(privateKey: string): Promise<string>;
  decrypt(encrypted: string): Promise<string>;
}
