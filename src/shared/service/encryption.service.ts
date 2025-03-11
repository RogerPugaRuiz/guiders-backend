import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly ivLength = 16;

  constructor(private readonly configService: ConfigService) {}

  encrypt(text: string): string {
    const iv = crypto.randomBytes(this.ivLength);
    const key = crypto
      .createHash('sha256')
      .update(this.configService.get<string>('ENCRYPTION_KEY')!)
      .digest('base64')
      .slice(0, 32);
    const cipher = crypto.createCipheriv(this.algorithm, Buffer.from(key), iv);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return iv.toString('base64') + ':' + encrypted;
  }

  decrypt(encryptedText: string): string {
    const [iv, content] = encryptedText.split(':');
    const key = crypto
      .createHash('sha256')
      .update(this.configService.get<string>('ENCRYPTION_KEY')!)
      .digest('base64')
      .slice(0, 32);
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      Buffer.from(key),
      Buffer.from(iv, 'base64'),
    );
    let decrypted = decipher.update(content, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
