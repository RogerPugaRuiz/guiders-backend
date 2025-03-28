import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IChatRepository } from '../domain/chat.repository';
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
import { Message } from '../domain/message/message';
import { MessageId } from '../domain/message/value-objects/message-id';
import { MessageEntity } from '../../message/infrastructure/entities/message.entity';
import { MessageMapper } from './mappers/message.mapper';

@Injectable()
export class TypeOrmChatService implements IChatRepository {
  constructor(
    @InjectRepository(ChatEntity)
    private readonly chatRepository: Repository<ChatEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
  ) {}

  async findOne(criteria: Criteria<Chat>): Promise<Optional<{ chat: Chat }>> {
    const queryBuilder = this.chatRepository.createQueryBuilder('chat');
    criteria.filters.forEach((filter) => {
      if (filter instanceof FilterGroup) {
        const subfilters = filter.filters.map((f: Filter<Chat>) => {
          switch (f.operator) {
            case Operator.IS_NULL:
              return `chat.${String(f.field)} IS NULL`;
            default:
              return `chat.${String(f.field)} ${String(f.operator)} :${String(f.field)}`;
          }
        });
        queryBuilder.andWhere(`(${subfilters.join(` ${filter.operator} `)})`);
        return;
      }
      queryBuilder.andWhere(
        `chat.${String(filter.field)} ${String(filter.operator)} :value`,
        {
          value: filter.value,
        },
      );
    });
    const entity = await queryBuilder.getOne();
    return entity
      ? Optional.of({ chat: ChatMapper.toDomain(entity) })
      : Optional.empty();
  }

  async find(criteria: Criteria<Chat>): Promise<{ chats: Chat[] }> {
    const queryBuilder = this.chatRepository.createQueryBuilder('chat');
    criteria.filters.forEach((filter) => {
      if (filter instanceof FilterGroup) {
        const subfilters = filter.filters.map((f: Filter<Chat>) => {
          if (f.operator === Operator.IS_NULL) {
            return `chat.${String(f.field)} IS NULL`;
          }

          return `chat.${String(f.field)} ${String(f.operator)} :${String(f.field)}`;
        });

        const parameters = filter.filters.reduce(
          (acc, f: Filter<Chat>) => {
            if (f.operator !== Operator.IS_NULL) {
              acc[String(f.field)] = f.value;
            }
            return acc;
          },
          {} as Record<string, unknown>,
        );

        queryBuilder.andWhere(
          `(${subfilters.join(` ${filter.operator} `)})`,
          parameters,
        );
        return;
      }
      queryBuilder.andWhere(
        `chat.${String(filter.field)} ${String(filter.operator)} :value`,
        {
          value: filter.value,
        },
      );
    });
    if (criteria.orderBy) {
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

    return { chats: entities.map((entity) => ChatMapper.toDomain(entity)) };
  }

  async save(chat: Chat): Promise<void> {
    const entity = ChatMapper.toPersistence(chat);
    await this.chatRepository.save(entity);
  }

  async saveMessage(message: Message): Promise<void> {
    const entity = MessageMapper.toEntity(message);
    await this.messageRepository.save(entity);
  }

  async findById(id: ChatId): Promise<Optional<{ chat: Chat }>> {
    const entity = await this.chatRepository.findOne({
      where: { id: id.value },
    });
    return entity
      ? Optional.of({ chat: ChatMapper.toDomain(entity) })
      : Optional.empty();
  }

  async findAll(): Promise<{ chats: Chat[] }> {
    const entities = await this.chatRepository.find();
    return { chats: entities.map((entity) => ChatMapper.toDomain(entity)) };
  }

  async findChatMessage(
    messageId: MessageId,
  ): Promise<Optional<{ message: Message }>> {
    const entity = await this.messageRepository.findOne({
      where: { id: messageId.value },
    });
    return entity
      ? Optional.of({ message: MessageMapper.toDomain(entity) })
      : Optional.empty();
  }

  async findChatMessages(
    criteria: Criteria<Message>,
  ): Promise<{ messages: Message[] }> {
    const { filters, limit, offset, orderBy, index } = criteria;
    console.log('criteria', criteria);
    const queryBuilder = this.messageRepository.createQueryBuilder('message');

    // Aplicar filtros
    filters.forEach((filter) => {
      if (filter instanceof FilterGroup) {
        const subfilters = filter.filters.map((f: Filter<Message>) => {
          switch (f.operator) {
            case Operator.IS_NULL:
              return `message.${String(f.field)} IS NULL`;
            default:
              return `message.${String(f.field)} ${String(f.operator)} :${String(f.field)}`;
          }
        });
        queryBuilder.andWhere(`(${subfilters.join(` ${filter.operator} `)})`);
        return;
      }
      queryBuilder.andWhere(
        `message.${String(filter.field)} ${String(filter.operator)} :value`,
        { value: filter.value },
      );
    });

    // Ordenar resultados
    if (orderBy) {
      queryBuilder.orderBy(
        `message.${String(orderBy.field)}`,
        orderBy.direction,
      );
      // Ordenamiento secundario para desempatar
      if (String(orderBy.field) === 'createdAt') {
        queryBuilder.addOrderBy('message.id', orderBy.direction);
      }
    }

    // Limitar la cantidad de registros
    if (limit) {
      queryBuilder.limit(limit);
    }

    // Si se proporciona el index, usamos paginación basada en cursor compuesta.
    // Se espera que index.value sea un objeto: { createdAt: Date, id: string }
    if (index) {
      const value = index.value as { createdAt: Date; id: string };
      console.log('index', index);
      if (orderBy && orderBy.direction.toUpperCase() === 'DESC') {
        queryBuilder.andWhere(
          `(message.${String(index.field)} < :cursorCreatedAt OR (message.${String(index.field)} = :cursorCreatedAt AND message.id < :cursorId))`,
          {
            cursorCreatedAt: value.createdAt,
            cursorId: value.id,
          },
        );
      } else {
        queryBuilder.andWhere(
          `(message.${String(index.field)} > :cursorCreatedAt OR (message.${String(index.field)} = :cursorCreatedAt AND message.id > :cursorId))`,
          {
            cursorCreatedAt: value.createdAt,
            cursorId: value.id,
          },
        );
      }
    } else if (offset) {
      queryBuilder.offset(offset);
    }

    const entities = await queryBuilder.getMany();

    return {
      messages: entities.map((entity: MessageEntity) =>
        MessageMapper.toDomain(entity),
      ),
    };
  }
}
