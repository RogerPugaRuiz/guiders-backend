import { Message } from './entities/message.aggregate';
import { MessageId } from './value-objects/message-id';
import { ChatId } from './value-objects/chat-id';
import { MessageType } from './value-objects/message-type';
import { VisitorId } from './value-objects/visitor-id';
import { CommercialId } from './value-objects/commercial-id';
import { Result } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { Criteria } from 'src/context/shared/domain/criteria';

/**
 * Filtros específicos para consultas de mensajes
 */
export interface MessageFilters {
  types?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  senderId?: string;
  senderType?: 'visitor' | 'commercial' | 'system';
  isRead?: boolean;
  hasAttachments?: boolean;
  keyword?: string;
}

/**
 * Opciones de ordenamiento para mensajes
 */
export interface MessageSortOptions {
  field: 'sentAt' | 'readAt' | 'type';
  direction: 'ASC' | 'DESC';
}

/**
 * Resultado de consulta paginada de mensajes
 */
export interface MessageSearchResult {
  messages: Message[];
  total: number;
  hasMore: boolean;
}

/**
 * Estadísticas de conversación
 */
export interface ConversationStats {
  totalMessages: number;
  messagesByType: Record<string, number>;
  averageResponseTime: number;
  unreadCount: number;
  lastActivity: Date;
  participantCount: number;
}

/**
 * Métricas de mensajería por período
 */
export interface MessageMetrics {
  period: string;
  totalMessages: number;
  messagesByType: Record<string, number>;
  averageLength: number;
  responseTimeMinutes: number;
}

/**
 * Interfaz del repositorio de Message V2
 * Define todas las operaciones de persistencia para la entidad Message
 */
export interface IMessageRepository {
  /**
   * Guarda un mensaje en el repositorio
   */
  save(message: Message): Promise<Result<void, DomainError>>;

  /**
   * Busca un mensaje por su ID
   */
  findById(messageId: MessageId): Promise<Result<Message, DomainError>>;

  /**
   * Busca todos los mensajes (use con precaución)
   */
  findAll(): Promise<Result<Message[], DomainError>>;

  /**
   * Elimina un mensaje por su ID
   */
  delete(messageId: MessageId): Promise<Result<void, DomainError>>;

  /**
   * Actualiza un mensaje existente
   */
  update(message: Message): Promise<Result<void, DomainError>>;

  /**
   * Busca un mensaje que cumple con criterios específicos
   */
  findOne(criteria: Criteria<Message>): Promise<Result<Message, DomainError>>;

  /**
   * Busca múltiples mensajes que cumplen con criterios específicos
   */
  match(criteria: Criteria<Message>): Promise<Result<Message[], DomainError>>;

  // Métodos específicos para el dominio de mensajería

  /**
   * Obtiene todos los mensajes de un chat ordenados cronológicamente
   */
  findByChatId(
    chatId: ChatId,
    filters?: MessageFilters,
    sort?: MessageSortOptions,
    limit?: number,
    offset?: number,
  ): Promise<Result<MessageSearchResult, DomainError>>;

  /**
   * Obtiene mensajes enviados por un visitante específico
   */
  findByVisitorId(
    visitorId: VisitorId,
    chatId?: ChatId,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<Result<Message[], DomainError>>;

  /**
   * Obtiene mensajes enviados por un comercial específico
   */
  findByCommercialId(
    commercialId: CommercialId,
    chatId?: ChatId,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<Result<Message[], DomainError>>;

  /**
   * Obtiene mensajes no leídos de un chat
   */
  getUnreadMessages(
    chatId: ChatId,
    forRole?: 'visitor' | 'commercial',
  ): Promise<Result<Message[], DomainError>>;

  /**
   * Marca mensajes como leídos
   */
  markAsRead(
    messageIds: MessageId[],
    readBy: VisitorId | CommercialId,
  ): Promise<Result<void, DomainError>>;

  /**
   * Obtiene el último mensaje de un chat
   */
  getLastMessage(chatId: ChatId): Promise<Result<Message, DomainError>>;

  /**
   * Obtiene el primer mensaje de un chat
   */
  getFirstMessage(chatId: ChatId): Promise<Result<Message, DomainError>>;

  /**
   * Busca mensajes por tipo
   */
  findByType(
    messageType: MessageType,
    chatId?: ChatId,
    limit?: number,
  ): Promise<Result<Message[], DomainError>>;

  /**
   * Busca mensajes por contenido (búsqueda de texto)
   */
  searchByContent(
    keyword: string,
    chatId?: ChatId,
    filters?: MessageFilters,
  ): Promise<Result<Message[], DomainError>>;

  /**
   * Obtiene mensajes con archivos adjuntos
   */
  findWithAttachments(
    chatId?: ChatId,
    fileTypes?: string[],
  ): Promise<Result<Message[], DomainError>>;

  /**
   * Cuenta mensajes por chat
   */
  countByChatId(
    chatId: ChatId,
    filters?: MessageFilters,
  ): Promise<Result<number, DomainError>>;

  /**
   * Obtiene estadísticas de conversación
   */
  getConversationStats(
    chatId: ChatId,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<Result<ConversationStats, DomainError>>;

  /**
   * Obtiene métricas de mensajería por período
   */
  getMessageMetrics(
    dateFrom: Date,
    dateTo: Date,
    groupBy: 'hour' | 'day' | 'week',
    chatId?: ChatId,
  ): Promise<Result<MessageMetrics[], DomainError>>;

  /**
   * Obtiene el tiempo promedio de respuesta entre mensajes
   */
  getAverageResponseTime(
    chatId: ChatId,
    between?: 'visitor-commercial' | 'commercial-visitor',
  ): Promise<Result<number, DomainError>>;

  /**
   * Busca mensajes por rango de fechas
   */
  findByDateRange(
    dateFrom: Date,
    dateTo: Date,
    chatId?: ChatId,
    filters?: MessageFilters,
  ): Promise<Result<Message[], DomainError>>;

  /**
   * Obtiene mensajes del sistema para un chat
   */
  getSystemMessages(
    chatId: ChatId,
    limit?: number,
  ): Promise<Result<Message[], DomainError>>;

  /**
   * Busca el último mensaje leído por un usuario
   */
  getLastReadMessage(
    chatId: ChatId,
    userId: VisitorId | CommercialId,
  ): Promise<Result<Message, DomainError>>;

  /**
   * Obtiene la secuencia de mensajes entre dos fechas
   */
  getMessageSequence(
    chatId: ChatId,
    fromMessageId?: MessageId,
    toMessageId?: MessageId,
  ): Promise<Result<Message[], DomainError>>;
}

/**
 * Símbolo de inyección de dependencias para el repositorio de Message V2
 */
export const MESSAGE_V2_REPOSITORY = Symbol('MESSAGE_V2_REPOSITORY');
