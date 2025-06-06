export const CHAT_MESSAGE_ENCRYPTOR = 'ChatMessageEncryptor';

/**
 * Servicio para encriptar y desencriptar mensajes de chat usando AES
 */
export interface ChatMessageEncryptor {
  /**
   * Encripta un mensaje de texto usando AES
   * @param message Mensaje de texto plano a encriptar
   * @returns Mensaje encriptado como string
   */
  encrypt(message: string): Promise<string>;

  /**
   * Desencripta un mensaje encriptado usando AES
   * @param encryptedMessage Mensaje encriptado a desencriptar
   * @returns Mensaje de texto plano
   */
  decrypt(encryptedMessage: string): Promise<string>;
}
