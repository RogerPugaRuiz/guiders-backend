import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  IMessageRepository,
  MessageFilters,
  MessageSortOptions,
  MessageSearchResult,
  ConversationStats,
  MessageMetrics,
} from '../../../domain/message.repository';
import { Message } from '../../../domain/entities/message.aggregate';
import { MessageId } from '../../../domain/value-objects/message-id';
import { ChatId } from '../../../domain/value-objects/chat-id';
import { MessageType } from '../../../domain/value-objects/message-type';
import { VisitorId } from '../../../domain/value-objects/visitor-id';
import { CommercialId } from '../../../domain/value-objects/commercial-id';
import { Result, ok, err, okVoid } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { Criteria } from 'src/context/shared/domain/criteria';
import { MessageSchema } from '../../schemas/message.schema';
import { MessageMapper } from '../../mappers/message.mapper';

/**
 * Error específico para operaciones de persistencia de Message
 */
export class MessagePersistenceError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'MessagePersistenceError';
  }
}

/**
 * Implementación MongoDB del repositorio de Message V2
 * Implementación básica para tests de integración
 */
@Injectable()
export class MongoMessageRepositorySimple implements IMessageRepository {
  constructor(
    @InjectModel(MessageSchema.name)
    private readonly messageModel: Model<MessageSchema>,
    private readonly messageMapper: MessageMapper,
  ) {}

  /**
   * Guarda un mensaje en MongoDB
   */
  async save(message: Message): Promise<Result<void, DomainError>> {
    try {
      const schema = this.messageMapper.toSchema(message);

      // Obtener el siguiente número de secuencia para el chat
      const lastMessage = await this.messageModel
        .findOne({ chatId: message.chatId.value })
        .sort({ sequenceNumber: -1 });

      schema.sequenceNumber = lastMessage ? lastMessage.sequenceNumber + 1 : 1;

      await this.messageModel.create(schema);
      return okVoid();
    } catch (error) {
      return err(
        new MessagePersistenceError(
          `Error al guardar mensaje: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Busca un mensaje por su ID
   */
  async findById(messageId: MessageId): Promise<Result<Message, DomainError>> {
    try {
      const schema = await this.messageModel.findOne({
        id: messageId.value,
        isDeleted: false,
      });

      if (!schema) {
        return err(new MessagePersistenceError('Mensaje no encontrado'));
      }

      const message = this.messageMapper.toDomain(schema);
      return ok(message);
    } catch (error) {
      return err(
        new MessagePersistenceError(
          `Error al buscar mensaje: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Busca todos los mensajes (usar con precaución)
   */
  async findAll(): Promise<Result<Message[], DomainError>> {
    try {
      const schemas = await this.messageModel.find({ isDeleted: false });
      const messages = this.messageMapper.toDomainList(schemas);
      return ok(messages);
    } catch (error) {
      return err(
        new MessagePersistenceError(
          `Error al buscar mensajes: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Elimina un mensaje por su ID (marca como eliminado)
   */
  async delete(messageId: MessageId): Promise<Result<void, DomainError>> {
    try {
      const result = await this.messageModel.updateOne(
        { id: messageId.value },
        {
          isDeleted: true,
          deletedAt: new Date(),
          updatedAt: new Date(),
        },
      );

      if (result.matchedCount === 0) {
        return err(
          new MessagePersistenceError('Mensaje no encontrado para eliminar'),
        );
      }

      return okVoid();
    } catch (error) {
      return err(
        new MessagePersistenceError(
          `Error al eliminar mensaje: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Actualiza un mensaje existente (simplificado)
   */
  async update(message: Message): Promise<Result<void, DomainError>> {
    try {
      const result = await this.messageModel.updateOne(
        { id: message.id.value, isDeleted: false },
        { updatedAt: new Date() },
      );

      if (result.matchedCount === 0) {
        return err(
          new MessagePersistenceError('Mensaje no encontrado para actualizar'),
        );
      }

      return okVoid();
    } catch (error) {
      return err(
        new MessagePersistenceError(
          `Error al actualizar mensaje: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Busca un mensaje que cumple con criterios específicos
   */
  async findOne(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    criteria?: Criteria<Message>,
  ): Promise<Result<Message, DomainError>> {
    try {
      // Implementación básica - buscar por cualquier filtro básico
      const schema = await this.messageModel.findOne({ isDeleted: false });

      if (!schema) {
        return err(
          new MessagePersistenceError(
            'Mensaje no encontrado con los criterios especificados',
          ),
        );
      }

      const message = this.messageMapper.toDomain(schema);
      return ok(message);
    } catch (error) {
      return err(
        new MessagePersistenceError(
          `Error al buscar mensaje con criterios: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Busca múltiples mensajes que cumplen con criterios específicos
   */
  async match(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    criteria?: Criteria<Message>,
  ): Promise<Result<Message[], DomainError>> {
    try {
      // Implementación básica
      const schemas = await this.messageModel.find({ isDeleted: false });
      const messages = this.messageMapper.toDomainList(schemas);
      return ok(messages);
    } catch (error) {
      return err(
        new MessagePersistenceError(
          `Error al buscar mensajes con criterios: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Obtiene todos los mensajes de un chat ordenados cronológicamente
   */
  async findByChatId(
    chatId: ChatId,
    filters?: MessageFilters,
    sort?: MessageSortOptions,
    limit?: number,
    offset?: number,
  ): Promise<Result<MessageSearchResult, DomainError>> {
    try {
      const filter: Record<string, unknown> = {
        chatId: chatId.value,
        isDeleted: false,
      };

      if (filters) {
        if (filters.types?.length) {
          filter.type = { $in: filters.types };
        }
        if (filters.senderId) {
          filter.senderId = filters.senderId;
        }
        if (filters.senderType) {
          filter.senderType = filters.senderType;
        }
        if (filters.isRead !== undefined) {
          filter.isRead = filters.isRead;
        }
      }

      let query = this.messageModel.find(filter);

      if (sort) {
        const sortDirection = sort.direction === 'DESC' ? -1 : 1;
        query = query.sort({ [sort.field]: sortDirection });
      } else {
        query = query.sort({ sequenceNumber: 1 });
      }

      if (offset) {
        query = query.skip(offset);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const [schemas, total] = await Promise.all([
        query.exec(),
        this.messageModel.countDocuments(filter),
      ]);

      const messages = this.messageMapper.toDomainList(schemas);
      const hasMore = offset
        ? offset + schemas.length < total
        : schemas.length < total;

      return ok({
        messages,
        total,
        hasMore,
      });
    } catch (error) {
      return err(
        new MessagePersistenceError(
          `Error al buscar mensajes por chat: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Obtiene mensajes enviados por un visitante específico
   */
  async findByVisitorId(
    visitorId: VisitorId,
    chatId?: ChatId,
  ): Promise<Result<Message[], DomainError>> {
    try {
      const filter: Record<string, unknown> = {
        senderId: visitorId.value,
        senderType: 'visitor',
        isDeleted: false,
      };

      if (chatId) {
        filter.chatId = chatId.value;
      }

      const schemas = await this.messageModel.find(filter).sort({ sentAt: 1 });
      const messages = this.messageMapper.toDomainList(schemas);
      return ok(messages);
    } catch (error) {
      return err(
        new MessagePersistenceError(
          `Error al buscar mensajes por visitante: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Obtiene mensajes enviados por un comercial específico
   */
  async findByCommercialId(
    commercialId: CommercialId,
    chatId?: ChatId,
  ): Promise<Result<Message[], DomainError>> {
    try {
      const filter: Record<string, unknown> = {
        senderId: commercialId.value,
        senderType: 'commercial',
        isDeleted: false,
      };

      if (chatId) {
        filter.chatId = chatId.value;
      }

      const schemas = await this.messageModel.find(filter).sort({ sentAt: 1 });
      const messages = this.messageMapper.toDomainList(schemas);
      return ok(messages);
    } catch (error) {
      return err(
        new MessagePersistenceError(
          `Error al buscar mensajes por comercial: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Obtiene mensajes no leídos de un chat
   */
  async getUnreadMessages(
    chatId: ChatId,
    forRole?: 'visitor' | 'commercial',
  ): Promise<Result<Message[], DomainError>> {
    try {
      const filter: Record<string, unknown> = {
        chatId: chatId.value,
        isRead: false,
        isDeleted: false,
      };

      if (forRole) {
        filter.senderType = forRole === 'visitor' ? 'commercial' : 'visitor';
      }

      const schemas = await this.messageModel.find(filter).sort({ sentAt: 1 });
      const messages = this.messageMapper.toDomainList(schemas);
      return ok(messages);
    } catch (error) {
      return err(
        new MessagePersistenceError(
          `Error al buscar mensajes no leídos: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Marca mensajes como leídos (actualizado para simplificar)
   * @param messageIds - Array de IDs de mensajes en formato string
   * @param readBy - ID del usuario que marca como leído (string)
   * @returns Number de mensajes marcados como leídos
   */
  async markAsRead(
    messageIds: string[],
    readBy: string,
  ): Promise<Result<number, DomainError>> {
    try {
      const now = new Date();

      const result = await this.messageModel.updateMany(
        { id: { $in: messageIds }, isDeleted: false },
        {
          isRead: true,
          readBy: readBy,
          readAt: now,
          updatedAt: now,
        },
      );

      return ok(result.modifiedCount);
    } catch (error) {
      return err(
        new MessagePersistenceError(
          `Error al marcar mensajes como leídos: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Obtiene el último mensaje de un chat
   */
  async getLastMessage(chatId: ChatId): Promise<Result<Message, DomainError>> {
    try {
      const schema = await this.messageModel
        .findOne({
          chatId: chatId.value,
          isDeleted: false,
        })
        .sort({ sentAt: -1, sequenceNumber: -1 });

      if (!schema) {
        return err(
          new MessagePersistenceError(
            'No se encontró ningún mensaje en el chat',
          ),
        );
      }

      const message = this.messageMapper.toDomain(schema);
      return ok(message);
    } catch (error) {
      return err(
        new MessagePersistenceError(
          `Error al obtener último mensaje: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Obtiene el primer mensaje de un chat
   */
  async getFirstMessage(chatId: ChatId): Promise<Result<Message, DomainError>> {
    try {
      const schema = await this.messageModel
        .findOne({
          chatId: chatId.value,
          isDeleted: false,
        })
        .sort({ sentAt: 1, sequenceNumber: 1 });

      if (!schema) {
        return err(
          new MessagePersistenceError(
            'No se encontró ningún mensaje en el chat',
          ),
        );
      }

      const message = this.messageMapper.toDomain(schema);
      return ok(message);
    } catch (error) {
      return err(
        new MessagePersistenceError(
          `Error al obtener primer mensaje: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  // Implementaciones básicas para cumplir con la interfaz
  // eslint-disable-next-line @typescript-eslint/require-await
  async findByType(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    messageType: MessageType,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    chatId?: ChatId,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    limit?: number,
  ): Promise<Result<Message[], DomainError>> {
    return ok([]);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async searchByContent(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    keyword: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    chatId?: ChatId,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    filters?: MessageFilters,
  ): Promise<Result<Message[], DomainError>> {
    return ok([]);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async findWithAttachments(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    chatId?: ChatId,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    fileTypes?: string[],
  ): Promise<Result<Message[], DomainError>> {
    return ok([]);
  }

  async countByChatId(
    chatId: ChatId,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    filters?: MessageFilters,
  ): Promise<Result<number, DomainError>> {
    try {
      const count = await this.messageModel.countDocuments({
        chatId: chatId.value,
        isDeleted: false,
      });
      return ok(count);
    } catch {
      return err(new MessagePersistenceError('Error al contar mensajes'));
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getConversationStats(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    chatId: ChatId,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    dateFrom?: Date,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    dateTo?: Date,
  ): Promise<Result<ConversationStats, DomainError>> {
    const stats: ConversationStats = {
      totalMessages: 0,
      messagesByType: {},
      averageResponseTime: 0,
      unreadCount: 0,
      lastActivity: new Date(),
      participantCount: 0,
    };
    return ok(stats);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getMessageMetrics(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    dateFrom: Date,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    dateTo: Date,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    groupBy: 'hour' | 'day' | 'week',
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    chatId?: ChatId,
  ): Promise<Result<MessageMetrics[], DomainError>> {
    return ok([]);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getAverageResponseTime(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    chatId: ChatId,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    between?: 'visitor-commercial' | 'commercial-visitor',
  ): Promise<Result<number, DomainError>> {
    return ok(0);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async findByDateRange(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    dateFrom: Date,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    dateTo: Date,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    chatId?: ChatId,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    filters?: MessageFilters,
  ): Promise<Result<Message[], DomainError>> {
    return ok([]);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getSystemMessages(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    chatId: ChatId,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    limit?: number,
  ): Promise<Result<Message[], DomainError>> {
    return ok([]);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getLastReadMessage(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    chatId: ChatId,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    userId: VisitorId | CommercialId,
  ): Promise<Result<Message, DomainError>> {
    return err(new MessagePersistenceError('No implementado'));
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getMessageSequence(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    chatId: ChatId,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    fromMessageId?: MessageId,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    toMessageId?: MessageId,
  ): Promise<Result<Message[], DomainError>> {
    return ok([]);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async count(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    criteria?: Criteria<Message>,
  ): Promise<Result<number, DomainError>> {
    return ok(0);
  }
}
