import { DomainEvent } from 'src/context/shared/domain/domain-event';

/**
 * Interfaz para los datos del chat creado
 */
export interface ChatCreatedData {
  chatId: string;
  visitorId: string;
  companyId: string;
  status: string;
  priority: string;
  visitorInfo: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    ipAddress?: string;
    location?: {
      country?: string;
      city?: string;
    };
    referrer?: string;
    userAgent?: string;
  };
  metadata?: {
    department?: string;
    product?: string;
    source?: string;
    tags?: string[];
  };
  createdAt: Date;
}

/**
 * Evento de dominio que se dispara cuando se crea un nuevo chat V2
 */
export class ChatCreatedEvent extends DomainEvent<{
  chat: ChatCreatedData;
}> {
  constructor(data: { chat: ChatCreatedData }) {
    super(data);
  }

  /**
   * Nombre del evento para identificación
   */
  static eventName = 'chat.v2.created';

  /**
   * Obtiene los datos del chat creado
   */
  getChatData(): ChatCreatedData {
    return this.attributes.chat;
  }

  /**
   * Obtiene el ID del chat
   */
  getChatId(): string {
    return this.attributes.chat.chatId;
  }

  /**
   * Obtiene el ID del visitante
   */
  getVisitorId(): string {
    return this.attributes.chat.visitorId;
  }

  /**
   * Obtiene el ID de la empresa
   */
  getCompanyId(): string {
    return this.attributes.chat.companyId;
  }
}
