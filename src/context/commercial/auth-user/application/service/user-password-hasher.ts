export const USER_PASSWORD_HASHER = 'UserPasswordHasher';
export interface UserPasswordHasher {
  hash(plainText: string): Promise<string>;
  compare(plainText: string, hashed: string): Promise<boolean>;
}
