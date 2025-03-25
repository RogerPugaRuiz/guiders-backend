import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IChatRepository } from '../domain/chat.repository';
import { Chat } from '../domain/chat';
import { ChatMapper } from './chat-mapper';
import { DbChatEntity } from './db-chat.entity';
import { ChatId } from '../domain/value-objects/chat-id';
import { Criteria } from 'src/context/shared/domain/criteria';
import { Optional } from 'src/context/shared/domain/optional';

@Injectable()
export class DbChatService implements IChatRepository {
  constructor(
    @InjectRepository(DbChatEntity)
    private readonly chatRepository: Repository<DbChatEntity>,
  ) {}

  async findOne(criteria: Criteria<Chat>): Promise<Optional<Chat>> {
    const queryBuilder = this.chatRepository.createQueryBuilder('chat');
    criteria.filters.forEach((filter) => {
      queryBuilder.andWhere(
        `chat.${String(filter.field)} ${String(filter.operator)} :value`,
        {
          value: filter.value,
        },
      );
    });
    const entity = await queryBuilder.getOne();
    return entity ? Optional.of(ChatMapper.toDomain(entity)) : Optional.empty();
  }

  async find(criteria: Criteria<Chat>): Promise<Chat[]> {
    const queryBuilder = this.chatRepository.createQueryBuilder('chat');
    criteria.filters.forEach((filter) => {
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
    return entities.map((entity) => ChatMapper.toDomain(entity));
  }

  async save(chat: Chat): Promise<void> {
    const entity = ChatMapper.toPersistence(chat);
    await this.chatRepository.save(entity);
  }

  async findById(id: ChatId): Promise<Chat | undefined> {
    const entity = await this.chatRepository.findOne({
      where: { id: id.value },
    });
    return entity ? ChatMapper.toDomain(entity) : undefined;
  }

  async findAll(): Promise<Chat[]> {
    const entities = await this.chatRepository.find();
    return entities.map((entity) => ChatMapper.toDomain(entity));
  }
}
