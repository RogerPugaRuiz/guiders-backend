import { Injectable } from '@nestjs/common';
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

@Injectable()
export class TypeOrmChatService implements IChatRepository {
  constructor(
    @InjectRepository(ChatEntity)
    private readonly chatRepository: Repository<ChatEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    @InjectRepository(ParticipantsEntity)
    private readonly participantsRepository: Repository<ParticipantsEntity>,
  ) {}
  async findOne(criteria: Criteria<Chat>): Promise<Optional<{ chat: Chat }>> {
    const queryBuilder = this.chatRepository
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.participants', 'participants');
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
    const queryBuilder = this.chatRepository
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.participants', 'participants');
    criteria.filters.forEach((filter) => {
      if (filter instanceof FilterGroup) {
        const subfilters = filter.filters.map((f: Filter<Chat>) => {
          if (f.field === 'participants') {
            return `chat.id IN (
              SELECT cp.chat_id
              FROM chat_participants cp
              WHERE cp.participant_id ${String(f.operator)} :participantId
            )`;
          }
          if (f.operator === Operator.IS_NULL) {
            return `chat.${String(f.field)} IS NULL`;
          }

          return `chat.${String(f.field)} ${String(f.operator)} :${String(f.value)}`;
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
      if (filter.field === 'participants') {
        queryBuilder.andWhere(
          `chat.id IN (
            SELECT cp.chat_id
            FROM chat_participants cp
            WHERE cp.participant_id ${String(filter.operator)} :participantId
          )`,
          { participantId: filter.value },
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

    return { chats: entities.map((entity) => ChatMapper.toDomain(entity)) };
  }

  async save(chat: Chat): Promise<void> {
    const entity = ChatMapper.toPersistence(chat);
    await this.chatRepository.save(entity);
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
}
