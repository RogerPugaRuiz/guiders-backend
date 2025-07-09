import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Criteria } from 'src/context/shared/domain/criteria';
import { Optional } from 'src/context/shared/domain/optional';
import { Result, err, okVoid } from 'src/context/shared/domain/result';
import { Message } from '../../../domain/message';
import { IMessageRepository } from '../../../domain/message.repository';
import { SaveMessageError } from '../../../domain/errors';
import { MessageMongooseEntity } from '../entity/message-mongoose.mongodb-entity';
import { MessageMongooseMapper } from '../mappers/message-mongoose.mapper';
import { ChatMessageEncryptorService } from '../../../../chat/infrastructure/chat-message-encryptor.service';
import { CHAT_MESSAGE_ENCRYPTOR } from '../../../../chat/application/services/chat-message-encryptor';

/**
 * Implementación del repositorio de mensajes usando MongoDB con Mongoose
 * Proporciona persistencia para los mensajes con cifrado automático
 */
@Injectable()
export class MongoMessageRepository implements IMessageRepository {
  private readonly logger = new Logger(MongoMessageRepository.name);

  constructor(
    @InjectModel(MessageMongooseEntity.name)
    private readonly messageModel: Model<MessageMongooseEntity>,
    @Inject(CHAT_MESSAGE_ENCRYPTOR)
    private readonly chatMessageEncryptor: ChatMessageEncryptorService,
  ) {}

  /**
   * Busca un mensaje que coincida con los criterios especificados
   */
  async findOne(
    criteria: Criteria<Message>,
  ): Promise<Optional<{ message: Message }>> {
    try {
      // Construir la consulta MongoDB a partir del criterio
      const mongoQuery = this.buildMongoQuery(criteria);

      const entity = await this.messageModel.findOne(mongoQuery).exec();

      if (!entity) {
        return Optional.empty();
      }

      const message = await MessageMongooseMapper.toDomain(
        entity,
        this.chatMessageEncryptor,
      );

      return Optional.of({ message });
    } catch (error) {
      this.logger.error(
        `Error al buscar mensaje: ${error instanceof Error ? error.message : String(error)}`,
      );
      return Optional.empty();
    }
  }

  /**
   * Busca múltiples mensajes que coincidan con los criterios especificados
   */
  async find(criteria: Criteria<Message>): Promise<{ messages: Message[] }> {
    try {
      // Construir la consulta MongoDB a partir del criterio
      const mongoQuery = this.buildMongoQuery(criteria);

      let query = this.messageModel.find(mongoQuery);

      // Aplicar ordenamiento si está especificado
      if (criteria.orderBy) {
        const sortOptions: Record<string, 1 | -1> = {};

        if (Array.isArray(criteria.orderBy)) {
          // Múltiples ordenamientos
          criteria.orderBy.forEach((order) => {
            const field = this.mapDomainFieldToMongoField(String(order.field));
            sortOptions[field] = order.direction === 'ASC' ? 1 : -1;
          });
        } else {
          // Un solo ordenamiento
          const field = this.mapDomainFieldToMongoField(
            String(criteria.orderBy.field),
          );
          sortOptions[field] = criteria.orderBy.direction === 'ASC' ? 1 : -1;
        }

        query = query.sort(sortOptions);
      }

      // Aplicar límite si está especificado
      if (criteria.limit) {
        query = query.limit(criteria.limit);
      }

      // Aplicar offset si está especificado
      if (criteria.offset) {
        query = query.skip(criteria.offset);
      }

      const entities = await query.exec();

      // Convertir entidades a objetos de dominio
      const messages = await Promise.all(
        entities.map((entity) =>
          MessageMongooseMapper.toDomain(entity, this.chatMessageEncryptor),
        ),
      );

      return { messages };
    } catch (error) {
      this.logger.error(
        `Error al buscar mensajes: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { messages: [] };
    }
  }

  /**
   * Guarda un mensaje en la base de datos
   */
  async save(message: Message): Promise<Result<void, SaveMessageError>> {
    try {
      const entityData = await MessageMongooseMapper.toMongoDB(
        message,
        this.chatMessageEncryptor,
      );

      // Usar upsert para actualizar o crear
      await this.messageModel.updateOne({ id: entityData.id }, entityData, {
        upsert: true,
      });

      return okVoid();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error al guardar mensaje: ${errorMessage}`);

      return err(
        new SaveMessageError(`Error al guardar mensaje: ${errorMessage}`),
      );
    }
  }

  /**
   * Construye una consulta MongoDB a partir de un objeto Criteria
   */
  private buildMongoQuery(
    criteria: Criteria<Message>,
  ): Record<string, unknown> {
    const mongoQuery: Record<string, unknown> = {};

    if (criteria.filters && criteria.filters.length > 0) {
      const conditions: unknown[] = [];

      criteria.filters.forEach((filterGroup) => {
        if ('filters' in filterGroup) {
          // Es un FilterGroup
          const groupConditions: unknown[] = [];

          filterGroup.filters.forEach((filter) => {
            if ('field' in filter) {
              const condition = this.buildFilterCondition(filter);
              if (condition) {
                groupConditions.push(condition);
              }
            }
          });

          if (groupConditions.length > 0) {
            if (filterGroup.operator === 'AND') {
              conditions.push({ $and: groupConditions });
            } else {
              conditions.push({ $or: groupConditions });
            }
          }
        } else if ('field' in filterGroup) {
          // Es un Filter individual
          const condition = this.buildFilterCondition(filterGroup);
          if (condition) {
            conditions.push(condition);
          }
        }
      });

      if (conditions.length > 0) {
        mongoQuery.$and = conditions;
      }
    }

    return mongoQuery;
  }

  /**
   * Construye una condición de filtro MongoDB a partir de un Filter
   */
  private buildFilterCondition(filter: {
    field: string | number | symbol;
    operator: string;
    value?: unknown;
  }): Record<string, unknown> | null {
    const field = this.mapDomainFieldToMongoField(String(filter.field));
    const { operator, value } = filter;

    switch (operator) {
      case '=':
      case 'EQUAL':
        return { [field]: value };
      case '!=':
      case 'NOT_EQUAL':
        return { [field]: { $ne: value } };
      case '>':
      case 'GT':
        return { [field]: { $gt: value } };
      case '>=':
      case 'GTE':
        return { [field]: { $gte: value } };
      case '<':
      case 'LT':
        return { [field]: { $lt: value } };
      case '<=':
      case 'LTE':
        return { [field]: { $lte: value } };
      case 'LIKE':
      case 'CONTAINS':
        return { [field]: { $regex: value, $options: 'i' } };
      case 'NOT_CONTAINS':
        return { [field]: { $not: { $regex: value, $options: 'i' } } };
      case 'IN':
        return { [field]: { $in: Array.isArray(value) ? value : [value] } };
      case 'NOT IN':
      case 'NOT_IN':
        return { [field]: { $nin: Array.isArray(value) ? value : [value] } };
      case 'IS NULL':
        return { [field]: null };
      case 'IS NOT NULL':
        return { [field]: { $ne: null } };
      default:
        this.logger.warn(`Operador no soportado: ${operator}`);
        return null;
    }
  }

  /**
   * Mapea campos del dominio a campos de MongoDB
   */
  private mapDomainFieldToMongoField(domainField: string): string {
    const fieldMap: Record<string, string> = {
      id: 'id',
      content: 'content',
      sender: 'sender',
      chatId: 'chatId',
      timestamp: 'timestamp',
      isRead: 'isRead',
      metadata: 'metadata',
      attachments: 'attachments',
    };

    return fieldMap[domainField] || domainField;
  }
}
