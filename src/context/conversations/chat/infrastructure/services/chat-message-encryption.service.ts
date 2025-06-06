import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

/**
 * Servicio de infraestructura para encriptar y verificar mensajes del chat
 * Utiliza bcrypt para el procesamiento seguro de mensajes
 */
@Injectable()
export class ChatMessageEncryptionService {
  private readonly saltRounds = 10;

  /**
   * Encripta un mensaje de texto usando bcrypt
   * @param message - El mensaje de texto a encriptar
   * @returns Promise con el mensaje encriptado
   */
  async encryptMessage(message: string): Promise<string> {
    return await bcrypt.hash(message, this.saltRounds);
  }

  /**
   * Verifica si un mensaje coincide con su versión encriptada
   * @param plainMessage - El mensaje en texto plano
   * @param encryptedMessage - El mensaje encriptado
   * @returns Promise con el resultado de la verificación
   */
  async verifyMessage(
    plainMessage: string,
    encryptedMessage: string,
  ): Promise<boolean> {
    return await bcrypt.compare(plainMessage, encryptedMessage);
  }
}
