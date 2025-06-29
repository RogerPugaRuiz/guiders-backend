import { Inject, Injectable } from '@nestjs/common';
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

    if (criteria.orderBy && !Array.isArray(criteria.orderBy)) {
      queryBuilder.orderBy(
        `chat.${String(criteria.orderBy.field)}`,
        criteria.orderBy.direction,
      );
    }
    if (criteria.limit) {
      queryBuilder.limit(criteria.limit);
    }
    if (criteria.offset) {
      queryBuilder.offset(criteria.offset);
    }
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
    const entity = await ChatMapper.toPersistence(
      chat,
      this.chatMessageEncryptor,
    );
    await this.chatRepository.save(entity);
  }

  async findById(id: ChatId): Promise<Optional<{ chat: Chat }>> {
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
