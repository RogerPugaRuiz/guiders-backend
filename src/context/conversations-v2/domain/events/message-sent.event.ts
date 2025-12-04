import { DomainEvent } from 'src/context/shared/domain/domain-event';

/**
 * Datos del mensaje enviado
 */
export interface MessageSentData {
  messageId: string;
  chatId: string;
  senderId: string;
  content: string;
  type: string;
  isFirstResponse: boolean;
  isInternal: boolean;
  sentAt: Date;
  attachment?: {
    url: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  };
}

/**
 * Evento de dominio que se dispara cuando se envía un mensaje
 */
export class MessageSentEvent extends DomainEvent<{
  message: MessageSentData;
}> {
  constructor(data: { message: MessageSentData }) {
    super(data);
  }

  /**
   * Nombre del evento para identificación
   */
  static eventName = 'message.v2.sent';

  /**
   * Obtiene los datos del mensaje
   */
  getMessageData(): MessageSentData {
    return this.attributes.message;
  }

  /**
   * Obtiene el ID del mensaje
   */
  getMessageId(): string {
    return this.attributes.message.messageId;
  }

  /**
   * Obtiene el ID del chat
   */
  getChatId(): string {
    return this.attributes.message.chatId;
  }

  /**
   * Obtiene el ID del remitente
   */
  getSenderId(): string {
    return this.attributes.message.senderId;
  }

  /**
   * Verifica si es la primera respuesta del comercial
   */
  isFirstResponse(): boolean {
    return this.attributes.message.isFirstResponse;
  }

  /**
   * Verifica si es un mensaje interno
   */
  isInternal(): boolean {
    return this.attributes.message.isInternal;
  }

  /**
   * Verifica si tiene adjunto
   */
  hasAttachment(): boolean {
    return Boolean(this.attributes.message.attachment);
  }
}
