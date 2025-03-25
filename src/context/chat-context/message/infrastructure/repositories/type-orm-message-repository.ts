import { Injectable } from '@nestjs/common';
import { IMessageRepository } from '../../domain/repository';
import { Criteria } from '../../../../shared/domain/criteria';
import { Optional } from '../../../../shared/domain/optional';
import { Message } from '../../domain/message';
import { InjectRepository } from '@nestjs/typeorm';
import { MessageEntity } from '../entities/message.entity';
import { Repository } from 'typeorm';
import { MessageMapper } from '../mappers/message.mapper';

@Injectable()
export class TypeOrmMessageRepository implements IMessageRepository {
  constructor(
    @InjectRepository(MessageEntity)
    private readonly repository: Repository<MessageEntity>,
  ) {}

  async save(message: Message): Promise<void> {
    await this.repository.save(MessageMapper.toEntity(message));
  }

  async find(criteria: Criteria<Message>): Promise<{ messages: Message[] }> {
    const { filters, limit, offset, orderBy } = criteria;
    const queryBuilder = this.repository.createQueryBuilder('message');
    filters.forEach((filter) => {
      queryBuilder.andWhere(
        `message.${String(filter.field)} ${String(filter.operator)} :value`,
        {
          value: filter.value,
        },
      );
    });

    if (orderBy) {
      queryBuilder.orderBy(
        `message.${String(orderBy.field)}`,
        orderBy.direction,
      );
    }

    if (limit) {
      queryBuilder.limit(limit);
    }
    if (offset) {
      queryBuilder.offset(offset);
    }
    const entities = await queryBuilder.getMany();

    return {
      messages: entities.map((entity) => MessageMapper.toDomain(entity)),
    };
  }

  async findOne(
    criteria: Criteria<Message>,
  ): Promise<Optional<{ message: Message }>> {
    const { filters } = criteria;
    const queryBuilder = this.repository.createQueryBuilder('message');
    filters.forEach((filter) => {
      queryBuilder.andWhere(
        `message.${String(filter.field)} ${String(filter.operator)} :value`,
        { value: filter.value },
      );
    });
    const entity = await queryBuilder.getOne();
    return entity
      ? Optional.of({ message: MessageMapper.toDomain(entity) })
      : Optional.empty();
  }
}
