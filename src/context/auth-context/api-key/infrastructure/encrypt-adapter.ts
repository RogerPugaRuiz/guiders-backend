import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { ApiKeyEncryptPrivateKey } from 'src/context/auth-context/api-key/application/services/api-key-encrypt-private-key';

@Injectable()
export class EncryptAdapter implements ApiKeyEncryptPrivateKey {
  private logger = new Logger(EncryptAdapter.name);
  constructor(private readonly configService: ConfigService) {}

  async encrypt(plainText: string): Promise<string> {
    const ENCRYPTION_KEY =
      this.configService.get<string>('ENCRYPTION_KEY') ||
      '0f0dd60415efd0a1d5c4409ed92fc1df3e4cfc517c4d3ad7d1e1d828f45f2bd4';
    this.logger.log('ENCRYPTION_KEY', ENCRYPTION_KEY);
    this.logger.log(this.configService.get('ENCRYPTION_KEY'));
    const IV_LENGTH = 16;
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      iv,
    );
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return Promise.resolve(iv.toString('hex') + ':' + encrypted);
  }

  async decrypt(encrypted: string): Promise<string> {
    const ENCRYPTION_KEY =
      this.configService.get<string>('ENCRYPTION_KEY') ||
      '0f0dd60415efd0a1d5c4409ed92fc1df3e4cfc517c4d3ad7d1e1d828f45f2bd4';
    this.logger.log('ENCRYPTION_KEY', ENCRYPTION_KEY);
    this.logger.log(this.configService.get('ENCRYPTION_KEY'));
    const [ivHex, encryptedData] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = createDecipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      iv,
    );
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return Promise.resolve(decrypted);
  }
}
