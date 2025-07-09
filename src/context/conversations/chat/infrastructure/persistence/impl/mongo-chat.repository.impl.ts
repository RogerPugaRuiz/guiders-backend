import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Query } from 'mongoose';
import { IChatRepository } from '../../../domain/chat/chat.repository';
import { Chat } from '../../../domain/chat/chat';
import { ChatId } from '../../../domain/chat/value-objects/chat-id';
import {
  Criteria,
  Filter,
  FilterGroup,
  Operator,
} from 'src/context/shared/domain/criteria';
import { Optional } from 'src/context/shared/domain/optional';
import { ChatMongooseEntity } from '../entity/chat-mongoose.mongodb-entity';
import { ChatMongooseMapper } from '../mappers/chat-mongoose.mapper';
import { CHAT_MESSAGE_ENCRYPTOR } from '../../../application/services/chat-message-encryptor';
import { ChatMessageEncryptorService } from '../../chat-message-encryptor.service';

/**
 * Implementación del repositorio de Chat usando MongoDB con Mongoose
 * Proporciona todas las operaciones CRUD para la entidad Chat
 */
@Injectable()
export class MongoChatRepository implements IChatRepository {
  private readonly logger = new Logger(MongoChatRepository.name);

  constructor(
    @InjectModel(ChatMongooseEntity.name)
    private readonly chatModel: Model<ChatMongooseEntity>,
    @Inject(CHAT_MESSAGE_ENCRYPTOR)
    private readonly chatMessageEncryptor: ChatMessageEncryptorService,
  ) {}

  /**
   * Guarda un chat en la base de datos
   */
  async save(chat: Chat): Promise<void> {
    this.logger.debug('Executing save for chat with id:', chat.id.value);

    const persistenceData = await ChatMongooseMapper.toPersistence(
      chat,
      this.chatMessageEncryptor,
    );

    await this.chatModel.findOneAndUpdate(
      { id: chat.id.value },
      persistenceData,
      { upsert: true, new: true },
    );
  }

  /**
   * Busca un chat por su ID
   */
  async findById(id: ChatId): Promise<Optional<{ chat: Chat }>> {
    const criteria = new Criteria<Chat>([
      new Filter<Chat>('id', Operator.EQUALS, id.value),
    ]);

    return this.findOne(criteria);
  }

  /**
   * Busca un chat que cumpla con un criterio específico
   */
  async findOne(criteria: Criteria<Chat>): Promise<Optional<{ chat: Chat }>> {
    const mongoQuery = this.buildMongoQuery(criteria);

    this.logger.debug(
      'Executing findOne with query:',
      JSON.stringify(mongoQuery),
    );

    const entity = await this.chatModel.findOne(mongoQuery);

    if (!entity) {
      return Optional.empty();
    }

    const chat = await ChatMongooseMapper.toDomain(
      entity,
      this.chatMessageEncryptor,
    );
    return Optional.of({ chat });
  }

  /**
   * Busca múltiples chats que cumplan con los criterios especificados
   */
  async find(criteria: Criteria<Chat>): Promise<{ chats: Chat[] }> {
    const mongoQuery = this.buildMongoQuery(criteria);

    this.logger.debug('Executing find with query:', JSON.stringify(mongoQuery));

    let query: Query<ChatMongooseEntity[], ChatMongooseEntity> =
      this.chatModel.find(mongoQuery);

    // Aplicar ordenamiento
    if (criteria.orderBy) {
      const orderBy = Array.isArray(criteria.orderBy)
        ? criteria.orderBy
        : [criteria.orderBy];
      const sortObject: Record<string, 1 | -1> = {};

      orderBy.forEach((order) => {
        const field = this.mapDomainFieldToMongoField(String(order.field));
        sortObject[field] = order.direction === 'ASC' ? 1 : -1;
      });

      query = query.sort(sortObject);
    }

    // Aplicar cursor para paginación
    if (criteria.cursor) {
      query = this.applyCursor(query, criteria.cursor);
    }

    // Aplicar límite
    if (criteria.limit !== undefined) {
      query = query.limit(criteria.limit);
    }

    // Aplicar offset
    if (criteria.offset !== undefined) {
      query = query.skip(criteria.offset);
    }

    const entities = await query.exec();

    const chats = await Promise.all(
      entities.map((entity) =>
        ChatMongooseMapper.toDomain(entity, this.chatMessageEncryptor),
      ),
    );

    return { chats };
  }

  /**
   * Obtiene todos los chats
   */
  async findAll(): Promise<{ chats: Chat[] }> {
    const criteria = new Criteria<Chat>();
    return this.find(criteria);
  }

  /**
   * Construye una consulta MongoDB a partir de un objeto Criteria
   */
  private buildMongoQuery(criteria: Criteria<Chat>): Record<string, unknown> {
    const mongoQuery: Record<string, unknown> = {};

    if (!criteria.filters || criteria.filters.length === 0) {
      return mongoQuery;
    }

    const conditions: Record<string, unknown>[] = [];

    criteria.filters.forEach((filterOrGroup) => {
      if (filterOrGroup instanceof Filter) {
        const condition = this.buildFilterCondition(filterOrGroup);
        conditions.push(condition);
      } else if (filterOrGroup instanceof FilterGroup) {
        const groupCondition = this.buildFilterGroupCondition(filterOrGroup);
        conditions.push(groupCondition);
      }
    });

    if (conditions.length === 1) {
      Object.assign(mongoQuery, conditions[0]);
    } else if (conditions.length > 1) {
      mongoQuery.$and = conditions;
    }

    return mongoQuery;
  }

  /**
   * Construye una condición MongoDB a partir de un filtro individual
   */
  private buildFilterCondition(filter: Filter<Chat>): Record<string, unknown> {
    const field = this.mapDomainFieldToMongoField(String(filter.field));
    const value = filter.value;

    // Manejo especial para filtros de participantes
    if (String(filter.field) === 'participants') {
      return this.buildParticipantFilterCondition(filter.operator, value);
    }

    switch (filter.operator) {
      case Operator.EQUALS:
        return { [field]: value };
      case Operator.NOT_EQUALS:
        return { [field]: { $ne: value } };
      case Operator.GREATER_THAN:
        return { [field]: { $gt: value } };
      case Operator.LESS_THAN:
        return { [field]: { $lt: value } };
      case Operator.GREATER_OR_EQUALS:
        return { [field]: { $gte: value } };
      case Operator.LESS_OR_EQUALS:
        return { [field]: { $lte: value } };
      case Operator.LIKE:
        return { [field]: { $regex: value, $options: 'i' } };
      case Operator.IN:
        return { [field]: { $in: Array.isArray(value) ? value : [value] } };
      case Operator.NOT_IN:
        return { [field]: { $nin: Array.isArray(value) ? value : [value] } };
      case Operator.IS_NULL:
        return { [field]: null };
      case Operator.IS_NOT_NULL:
        return { [field]: { $ne: null } };
      default:
        return { [field]: value };
    }
  }

  /**
   * Construye una condición MongoDB a partir de un grupo de filtros
   */
  private buildFilterGroupCondition(
    filterGroup: FilterGroup<Chat>,
  ): Record<string, unknown> {
    const conditions: Record<string, unknown>[] = [];

    filterGroup.filters.forEach((filterOrNestedGroup) => {
      if (filterOrNestedGroup instanceof Filter) {
        const condition = this.buildFilterCondition(filterOrNestedGroup);
        conditions.push(condition);
      } else if (filterOrNestedGroup instanceof FilterGroup) {
        const nestedCondition =
          this.buildFilterGroupCondition(filterOrNestedGroup);
        conditions.push(nestedCondition);
      }
    });

    if (conditions.length === 0) {
      return {};
    }

    if (conditions.length === 1) {
      return conditions[0];
    }

    const operator = filterGroup.operator === 'OR' ? '$or' : '$and';
    return { [operator]: conditions };
  }

  /**
   * Mapea campos de dominio a campos de MongoDB
   */
  private mapDomainFieldToMongoField(field: string): string {
    switch (field) {
      case 'participants':
        return 'participants.id';
      case 'lastMessageAt':
        return 'lastMessageAt';
      case 'id':
        return 'id';
      case 'companyId':
        return 'companyId';
      case 'status':
        return 'status';
      case 'createdAt':
        return 'createdAt';
      default:
        return field;
    }
  }

  /**
   * Aplica cursor para paginación
   */
  private applyCursor(
    query: Query<ChatMongooseEntity[], ChatMongooseEntity>,
    cursor: Record<string, unknown>,
  ): Query<ChatMongooseEntity[], ChatMongooseEntity> {
    // Para el caso específico de find-chat-list que usa lastMessageAt e id como cursor
    if ('lastMessageAt' in cursor && 'id' in cursor) {
      const { lastMessageAt, id } = cursor;

      if (lastMessageAt !== null) {
        return query.where({
          $or: [
            { lastMessageAt: { $lt: lastMessageAt } },
            { lastMessageAt: lastMessageAt, id: { $lt: id } },
          ],
        });
      } else {
        // Si lastMessageAt es null, solo usar id para el cursor
        return query.where({ id: { $lt: id } });
      }
    }

    return query;
  }

  /**
   * Construye condiciones MongoDB específicas para filtros de participantes
   * Los participantes están almacenados como un array de objetos con id
   */
  private buildParticipantFilterCondition(
    operator: Operator,
    value: unknown,
  ): Record<string, unknown> {
    const participantField = 'participants.id';

    switch (operator) {
      case Operator.EQUALS:
        // Busca si el participante está en el array
        return { [participantField]: value };
      case Operator.NOT_EQUALS:
        // Busca chats donde el participante NO está en el array
        return { [participantField]: { $ne: value } };
      case Operator.IN: {
        // Busca chats donde al menos uno de los participantes está en el array
        const inValues = Array.isArray(value) ? value : [value];
        return { [participantField]: { $in: inValues } };
      }
      case Operator.NOT_IN: {
        // Busca chats donde ninguno de los participantes está en el array
        const notInValues = Array.isArray(value) ? value : [value];
        return { [participantField]: { $nin: notInValues } };
      }
      default:
        // Para otros operadores, usar el comportamiento por defecto
        return { [participantField]: value };
    }
  }
}
