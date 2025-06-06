import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { ChatMessageEncryptor } from '../application/services/chat-message-encryptor';

/**
 * Servicio de infraestructura para encriptar y desencriptar mensajes de chat usando AES
 */
@Injectable()
export class ChatMessageEncryptorService implements ChatMessageEncryptor {
  private readonly logger = new Logger(ChatMessageEncryptorService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Encripta un mensaje de texto usando AES-256-CBC
   */
  async encrypt(message: string): Promise<string> {
    try {
      const encryptionKey = this.getEncryptionKey();
      const ivLength = 16; // Longitud del vector de inicialización para AES
      const iv = randomBytes(ivLength);

      const cipher = createCipheriv(
        'aes-256-cbc',
        Buffer.from(encryptionKey, 'hex'),
        iv,
      );
      let encrypted = cipher.update(message, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Retornamos IV + datos encriptados separados por ':'
      return Promise.resolve(iv.toString('hex') + ':' + encrypted);
    } catch (error) {
      this.logger.error('Error al encriptar mensaje de chat', error);
      throw new Error('Failed to encrypt chat message');
    }
  }

  /**
   * Desencripta un mensaje encriptado usando AES-256-CBC
   */
  async decrypt(encryptedMessage: string): Promise<string> {
    try {
      const encryptionKey = this.getEncryptionKey();
      const [ivHex, encryptedData] = encryptedMessage.split(':');

      if (!ivHex || !encryptedData) {
        throw new Error('Invalid encrypted message format');
      }

      const iv = Buffer.from(ivHex, 'hex');
      const decipher = createDecipheriv(
        'aes-256-cbc',
        Buffer.from(encryptionKey, 'hex'),
        iv,
      );

      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return Promise.resolve(decrypted);
    } catch (error) {
      this.logger.error('Error al desencriptar mensaje de chat', error);
      throw new Error('Failed to decrypt chat message');
    }
  }

  /**
   * Obtiene la clave de encriptación desde la configuración
   */
  private getEncryptionKey(): string {
    const key =
      this.configService.get<string>('ENCRYPTION_KEY') ||
      '0f0dd60415efd0a1d5c4409ed92fc1df3e4cfc517c4d3ad7d1e1d828f45f2bd4';
    return key;
  }
}
