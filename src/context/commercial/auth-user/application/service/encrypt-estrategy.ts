export const ENCRYPT_STRATEGY = 'EncryptStrategy';
export interface EncryptStrategy {
  encrypt(plainText: string): Promise<string>;
  decript(encrypted: string): Promise<string>;
}
