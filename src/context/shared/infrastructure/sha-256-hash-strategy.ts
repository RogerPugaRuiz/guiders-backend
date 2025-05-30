import { createHash } from 'crypto';
import { ApiKeyHasher } from 'src/context/auth/features/api-key/application/services/api-key-hasher';

export class Sha256HashStrategy implements ApiKeyHasher {
  async hash(plainText: string): Promise<string> {
    return Promise.resolve(
      createHash('sha256').update(plainText).digest('hex'),
    );
  }

  async compare(plainText: string, hashed: string): Promise<boolean> {
    const hashedText = await this.hash(plainText);
    return hashedText === hashed;
  }
}
