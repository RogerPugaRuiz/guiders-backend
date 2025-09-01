import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { ChatMessageEncryptor } from '../application/services/chat-message-encryptor';

interface EncryptionMetadata {
  userId?: string;
  messageId?: string;
  operation: 'encrypt' | 'decrypt';
}

/**
 * Servicio de infraestructura para encriptar y desencriptar mensajes de chat usando AES
 * Con soporte para versionado de keys y auditoría
 */
@Injectable()
export class ChatMessageEncryptorService implements ChatMessageEncryptor {
  private readonly logger = new Logger(ChatMessageEncryptorService.name);
  private readonly CURRENT_KEY_VERSION = 1;
  private readonly ALGORITHM = 'aes-256-cbc';
  private readonly IV_LENGTH = 16;
  // Marcador interno para validar integridad básica del contenido desencriptado (no autenticación fuerte)
  private readonly CONTENT_MARKER = 'CHMSG::';

  constructor(private readonly configService: ConfigService) {
    this.validateConfiguration();
  }

  /**
   * Encripta un mensaje de texto usando AES-256-CBC con versionado
   */
  async encrypt(
    message: string,
    metadata?: EncryptionMetadata,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const encryptionKey = this.getEncryptionKey();
        const iv = randomBytes(this.IV_LENGTH);

  const cipher = createCipheriv(this.ALGORITHM, encryptionKey, iv);
  // Prefijamos marcador para validar tras desencriptar y detectar clave errónea
  const payload = `${this.CONTENT_MARKER}${message}`;
  let encrypted = cipher.update(payload, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // Formato: version:iv:encrypted_data
        const result = `v${this.CURRENT_KEY_VERSION}:${iv.toString('hex')}:${encrypted}`;

        // Auditoría
        this.logOperation('encrypt', {
          keyVersion: this.CURRENT_KEY_VERSION,
          userId: metadata?.userId,
          messageId: metadata?.messageId,
          success: true,
        });

        resolve(result);
      } catch (error) {
        this.logger.error('Error al encriptar mensaje de chat', {
          error: error instanceof Error ? error.message : String(error),
          userId: metadata?.userId,
          messageId: metadata?.messageId,
        });

        this.logOperation('encrypt', {
          keyVersion: this.CURRENT_KEY_VERSION,
          userId: metadata?.userId,
          messageId: metadata?.messageId,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });

        reject(new Error('Failed to encrypt chat message'));
      }
    });
  }

  /**
   * Desencripta un mensaje encriptado usando AES-256-CBC con soporte para múltiples versiones
   */
  async decrypt(
    encryptedMessage: string,
    metadata?: EncryptionMetadata,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const { version, iv, encryptedData } =
          this.parseEncryptedMessage(encryptedMessage);
        const encryptionKey = this.getEncryptionKeyForVersion(version);

        const decipher = createDecipheriv(this.ALGORITHM, encryptionKey, iv);
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

          throw new Error('Marcador de integridad faltante');
        }

        // Removemos marcador antes de devolver
        decrypted = decrypted.substring(this.CONTENT_MARKER.length);

        // Auditoría
        this.logOperation('decrypt', {
          keyVersion: version,
          userId: metadata?.userId,
          messageId: metadata?.messageId,
          success: true,
        });

        resolve(decrypted);
      } catch (error) {
        this.logger.error('Error al desencriptar mensaje de chat', {
          error: error instanceof Error ? error.message : String(error),
          userId: metadata?.userId,
          messageId: metadata?.messageId,
        });

        this.logOperation('decrypt', {
          keyVersion: 'unknown',
          userId: metadata?.userId,
          messageId: metadata?.messageId,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });

        reject(new Error('Failed to decrypt chat message'));
      }
    });
  }

  /**
   * Valida que la configuración esté presente
   */
  private validateConfiguration(): void {
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');

    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }

    if (encryptionKey.length !== 64) {
      // 32 bytes = 64 hex chars
      throw new Error(
        'ENCRYPTION_KEY must be 64 hexadecimal characters (32 bytes)',
      );
    }

    // Validar que sea hexadecimal válido
    if (!/^[0-9a-fA-F]+$/.test(encryptionKey)) {
      throw new Error(
        'ENCRYPTION_KEY must contain only hexadecimal characters',
      );
    }

    this.logger.log('Encryption service initialized successfully', {
      keyVersion: this.CURRENT_KEY_VERSION,
      algorithm: this.ALGORITHM,
    });
  }

  /**
   * Parsea un mensaje encriptado y extrae version, IV y datos
   */
  private parseEncryptedMessage(encryptedMessage: string): {
    version: number;
    iv: Buffer;
    encryptedData: string;
  } {
    // Formato nuevo: v1:iv:data
    if (encryptedMessage.startsWith('v')) {
      const parts = encryptedMessage.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted message format');
      }

      const version = parseInt(parts[0].substring(1)); // Remover 'v'
      const ivHex = parts[1];
      const encryptedData = parts[2];

      if (isNaN(version) || !ivHex || !encryptedData) {
        throw new Error('Invalid encrypted message format');
      }

      return {
        version,
        iv: Buffer.from(ivHex, 'hex'),
        encryptedData,
      };
    }

    // Formato legacy: iv:data (version 1)
    const [ivHex, encryptedData] = encryptedMessage.split(':');
    if (!ivHex || !encryptedData) {
      throw new Error('Invalid encrypted message format');
    }

    return {
      version: 1,
      iv: Buffer.from(ivHex, 'hex'),
      encryptedData,
    };
  }

  /**
   * Obtiene la clave de encriptación para una versión específica
   */
  private getEncryptionKeyForVersion(version: number): Buffer {
    // Por ahora solo soportamos version 1
    // En el futuro puedes agregar ENCRYPTION_KEY_V2, etc.
    switch (version) {
      case 1:
        return this.getEncryptionKey();
      default:
        throw new Error(`Unsupported key version: ${version}`);
    }
  }

  /**
   * Obtiene la clave de encriptación actual desde la configuración
   */
  private getEncryptionKey(): Buffer {
    const key = this.configService.get<string>('ENCRYPTION_KEY');
    if (!key) {
      throw new Error('ENCRYPTION_KEY not found in configuration');
    }
    return Buffer.from(key, 'hex');
  }

  /**
   * Registra operaciones de encriptación para auditoría
   */
  private logOperation(
    operation: 'encrypt' | 'decrypt',
    details: {
      keyVersion: number | string;
      userId?: string;
      messageId?: string;
      success: boolean;
      error?: string;
    },
  ): void {
    const logData = {
      operation,
      timestamp: new Date().toISOString(),
      keyVersion: details.keyVersion,
      userId: details.userId || 'unknown',
      messageId: details.messageId || 'unknown',
      success: details.success,
      error: details.error,
    };

    if (details.success) {
      this.logger.log(`Encryption operation completed`, logData);
    } else {
      this.logger.warn(`Encryption operation failed`, logData);
    }
  }

  /**
   * Genera una nueva clave de encriptación (para rotación manual)
   * NOTA: En producción, esto debería integrarse con un key management service
   */
  generateNewEncryptionKey(): string {
    const key = randomBytes(32);
    this.logger.warn(
      'New encryption key generated - update ENCRYPTION_KEY environment variable',
      {
        keyLength: key.length,
        timestamp: new Date().toISOString(),
      },
    );
    return key.toString('hex');
  }

  /**
   * Verifica si un mensaje está encriptado con la versión actual
   */
  isCurrentVersion(encryptedMessage: string): boolean {
    try {
      const { version } = this.parseEncryptedMessage(encryptedMessage);
      return version === this.CURRENT_KEY_VERSION;
    } catch {
      return false;
    }
  }
}
