import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IChatRepository } from '../domain/chat/chat.repository';
import { Chat } from '../domain/chat/chat';
import { ChatMapper } from './mappers/chat-mapper';
import { ChatEntity } from './chat.entity';
import { ChatId } from '../domain/chat/value-objects/chat-id';
import {
  Criteria,
  Filter,
  FilterGroup,
  Operator,
} from 'src/context/shared/domain/criteria';
import { Optional } from 'src/context/shared/domain/optional';
import { MessageEntity } from '../../message/infrastructure/entities/message.entity';
import { ParticipantsEntity } from './participants.entity';
import { CHAT_MESSAGE_ENCRYPTOR } from '../application/services/chat-message-encryptor';
import { ChatMessageEncryptorService } from './chat-message-encryptor.service';

@Injectable()
export class TypeOrmChatService implements IChatRepository {
  private readonly logger = new Logger(TypeOrmChatService.name);

  constructor(
    @InjectRepository(ChatEntity)
    private readonly chatRepository: Repository<ChatEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    @InjectRepository(ParticipantsEntity)
    private readonly participantsRepository: Repository<ParticipantsEntity>,
    @Inject(CHAT_MESSAGE_ENCRYPTOR)
    private readonly chatMessageEncryptor: ChatMessageEncryptorService,
  ) {}
  async findOne(criteria: Criteria<Chat>): Promise<Optional<{ chat: Chat }>> {
    const queryBuilder = this.chatRepository
      .createQueryBuilder('chat')
      .innerJoinAndSelect('chat.participants', 'participants');

    // Contador para generar nombres únicos de parámetros
    let parameterCounter = 0;

    // Mapeo de campos de dominio a columnas de base de datos
    const fieldColumnMap: Record<string, string> = {
      id: 'id',
      companyId: 'companyId',
      status: 'status',
      lastMessage: 'lastMessage',
      lastMessageAt: 'lastMessageAt',
      createdAt: 'createdAt',
    };

    criteria.filters.forEach((filter) => {
      if (filter instanceof FilterGroup) {
        const subfilters: string[] = [];
        const parameters: Record<string, unknown> = {};

        filter.filters.forEach((f: Filter<Chat>) => {
          if (f.operator === Operator.IS_NULL) {
            const columnName =
              fieldColumnMap[String(f.field)] || String(f.field);
            subfilters.push(`chat.${columnName} IS NULL`);
            return;
          }

          const paramName = `param${parameterCounter++}`;
          const fieldName = String(f.field);
          const columnName = fieldColumnMap[fieldName] || fieldName;
          const uuidFields = ['id', 'companyId'];

          if (uuidFields.includes(fieldName)) {
            subfilters.push(
              `chat.${columnName} ${String(f.operator)} :${paramName}::uuid`,
            );
          } else {
            subfilters.push(
              `chat.${columnName} ${String(f.operator)} :${paramName}`,
            );
          }

          parameters[paramName] = f.value;
        });

        queryBuilder.andWhere(
          `(${subfilters.join(` ${filter.operator} `)})`,
          parameters,
        );
        return;
      }

      // Manejar filtro simple
      const paramName = `param${parameterCounter++}`;
      const fieldName = String(filter.field);
      const columnName = fieldColumnMap[fieldName] || fieldName;
      const uuidFields = ['id', 'companyId'];

      if (uuidFields.includes(fieldName)) {
        queryBuilder.andWhere(
          `chat.${columnName} ${String(filter.operator)} :${paramName}::uuid`,
          { [paramName]: filter.value },
        );
      } else {
        queryBuilder.andWhere(
          `chat.${columnName} ${String(filter.operator)} :${paramName}`,
          { [paramName]: filter.value },
        );
      }
    });

    // Log del SQL generado para debugging
    const sqlQuery = queryBuilder.getSql();
    const parameters = queryBuilder.getParameters();
    this.logger.debug('SQL Query for findOne:', sqlQuery);
    this.logger.debug('Parameters for findOne:', parameters);

    const entity = await queryBuilder.getOne();
    return entity
      ? Optional.of({
          chat: await ChatMapper.toDomain(entity, this.chatMessageEncryptor),
        })
      : Optional.empty();
  }

  async find(criteria: Criteria<Chat>): Promise<{ chats: Chat[] }> {
    const queryBuilder = this.chatRepository
      .createQueryBuilder('chat')
      .innerJoinAndSelect('chat.participants', 'participants');

    // Contador para generar nombres únicos de parámetros
    let parameterCounter = 0;

    // Mapeo de campos de dominio a columnas de base de datos
    const fieldColumnMap: Record<string, string> = {
      id: 'id',
      companyId: 'companyId',
      status: 'status',
      lastMessage: 'lastMessage',
      lastMessageAt: 'lastMessageAt',
      createdAt: 'createdAt',
    };

    criteria.filters.forEach((filter) => {
      if (filter instanceof FilterGroup) {
        const subfilters: string[] = [];
        const parameters: Record<string, unknown> = {};
        const uuidFields = ['id', 'companyId'];

        filter.filters.forEach((f: Filter<Chat>) => {
          if (f.field === 'participants') {
            const paramName = `participantId${parameterCounter++}`;
            subfilters.push(`chat.id IN (
              SELECT cp.chat_id
              FROM chat_participants cp
              WHERE cp.participant_id ${String(f.operator)} :${paramName}
            )`);
            parameters[paramName] = f.value;
            return;
          }

          if (f.operator === Operator.IS_NULL) {
            const columnName =
              fieldColumnMap[String(f.field)] || String(f.field);
            subfilters.push(`chat.${columnName} IS NULL`);
            return;
          }

          const paramName = `param${parameterCounter++}`;
          const fieldName = String(f.field);
          const columnName = fieldColumnMap[fieldName] || fieldName;

          if (uuidFields.includes(fieldName)) {
            subfilters.push(
              `chat.${columnName} ${String(f.operator)} :${paramName}::uuid`,
            );
          } else {
            subfilters.push(
              `chat.${columnName} ${String(f.operator)} :${paramName}`,
            );
          }

          parameters[paramName] = f.value;
        });

        queryBuilder.andWhere(
          `(${subfilters.join(` ${filter.operator} `)})`,
          parameters,
        );
        return;
      }

      // Manejar filtro simple
      if (filter.field === 'participants') {
        const paramName = `participantId${parameterCounter++}`;
        queryBuilder.andWhere(
          `chat.id IN (
            SELECT cp.chat_id
            FROM chat_participants cp
            WHERE cp.participant_id ${String(filter.operator)} :${paramName}
          )`,
          { [paramName]: filter.value },
        );
        return;
      }

      // Campos que son de tipo UUID en la base de datos
      const uuidFields = ['id', 'companyId'];
      const fieldName = String(filter.field);
      const columnName = fieldColumnMap[fieldName] || fieldName;
      const paramName = `param${parameterCounter++}`;

      if (uuidFields.includes(fieldName)) {
        queryBuilder.andWhere(
          `chat.${columnName} ${String(filter.operator)} :${paramName}::uuid`,
          { [paramName]: filter.value },
        );
      } else {
        queryBuilder.andWhere(
          `chat.${columnName} ${String(filter.operator)} :${paramName}`,
          { [paramName]: filter.value },
        );
      }
    });

    // Manejar ordenamiento múltiple - soporta múltiples llamadas a orderByField
    if (criteria.orderBy) {
      if (Array.isArray(criteria.orderBy)) {
        // Múltiples campos de ordenamiento
        criteria.orderBy.forEach((order, index) => {
          if (index === 0) {
            // Primer campo de ordenamiento usa orderBy
            queryBuilder.orderBy(
              `chat.${String(order.field)}`,
              order.direction,
            );
          } else {
            // Campos adicionales usan addOrderBy
            queryBuilder.addOrderBy(
              `chat.${String(order.field)}`,
              order.direction,
            );
          }
        });
      } else {
        // Un solo campo de ordenamiento
        queryBuilder.orderBy(
          `chat.${String(criteria.orderBy.field)}`,
          criteria.orderBy.direction,
        );
      }
    }
    if (criteria.limit) {
      queryBuilder.limit(criteria.limit);
    }
    if (criteria.offset) {
      queryBuilder.offset(criteria.offset);
    }

    // Log del SQL generado para debugging
    const sqlQuery = queryBuilder.getSql();
    const parameters = queryBuilder.getParameters();
    this.logger.debug('SQL Query for find:', sqlQuery);
    this.logger.debug('Parameters for find:', parameters);

    const entities = await queryBuilder.getMany();

    return {
      chats: await Promise.all(
        entities.map((entity) =>
          ChatMapper.toDomain(entity, this.chatMessageEncryptor),
        ),
      ),
    };
  }

  async save(chat: Chat): Promise<void> {
    // Log de la operación save
    this.logger.debug('Executing save for chat with id:', chat.id.value);

    const entity = await ChatMapper.toPersistence(
      chat,
      this.chatMessageEncryptor,
    );
    await this.chatRepository.save(entity);
  }

  async findById(id: ChatId): Promise<Optional<{ chat: Chat }>> {
    // Log de la operación findById
    this.logger.debug('Executing findById with id:', id.value);

    const entity = await this.chatRepository.findOne({
      where: { id: id.value },
    });
    return entity
      ? Optional.of({
          chat: await ChatMapper.toDomain(entity, this.chatMessageEncryptor),
        })
      : Optional.empty();
  }

  async findAll(): Promise<{ chats: Chat[] }> {
    // Log de la operación findAll
    this.logger.debug('Executing findAll - retrieving all chats');

    const entities = await this.chatRepository.find();
    return {
      chats: await Promise.all(
        entities.map((entity) =>
          ChatMapper.toDomain(entity, this.chatMessageEncryptor),
        ),
      ),
    };
  }
}
