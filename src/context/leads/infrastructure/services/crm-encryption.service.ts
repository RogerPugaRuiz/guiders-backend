import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * Servicio de cifrado AES-256-CBC para API keys de CRM almacenadas en MongoDB.
 * Usa el mismo patrón que EncryptAdapter del contexto auth.
 * El formato del texto cifrado es: <iv_hex>:<encrypted_hex>
 */
@Injectable()
export class CrmEncryptionService implements OnModuleInit {
  private readonly logger = new Logger(CrmEncryptionService.name);
  private readonly ALGORITHM = 'aes-256-cbc';
  private readonly IV_LENGTH = 16;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const key = this.configService.get<string>('ENCRYPTION_KEY');
    if (!key) {
      this.logger.warn(
        'ENCRYPTION_KEY no configurada — las API keys de CRM se almacenarán sin cifrar. ' +
          'Configure ENCRYPTION_KEY en producción.',
      );
    }
  }

  /**
   * Cifra un texto plano con AES-256-CBC.
   * Si ENCRYPTION_KEY no está configurada, retorna el texto plano (modo legacy).
   */
  encrypt(plainText: string): string {
    const key = this.getKey();
    if (!key) {
      return plainText;
    }

    const iv = randomBytes(this.IV_LENGTH);
    const cipher = createCipheriv(this.ALGORITHM, Buffer.from(key, 'hex'), iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Descifra un valor previamente cifrado.
   * Si el valor no tiene el formato esperado (no contiene ':' en posición 32),
   * asume que es un valor legacy en texto plano y lo retorna tal cual (fallback).
   */
  tryDecrypt(value: string): string {
    const key = this.getKey();
    if (!key) {
      return value;
    }

    // Detectar si parece estar cifrado: iv_hex(32 chars) + ':' + encrypted_hex
    const colonIndex = value.indexOf(':');
    if (colonIndex !== 32) {
      // Valor legacy en texto plano — fallback transparente
      this.logger.debug(
        'Valor CRM no cifrado detectado (legacy). Retornando en texto plano.',
      );
      return value;
    }

    try {
      const ivHex = value.substring(0, 32);
      const encryptedData = value.substring(33);
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = createDecipheriv(
        this.ALGORITHM,
        Buffer.from(key, 'hex'),
        iv,
      );
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      this.logger.warn(
        `Error al descifrar valor CRM — posiblemente texto plano legacy: ${error.message}`,
      );
      return value;
    }
  }

  private getKey(): string | null {
    return this.configService.get<string>('ENCRYPTION_KEY') || null;
  }
}
