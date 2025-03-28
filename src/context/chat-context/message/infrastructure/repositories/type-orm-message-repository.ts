import { Injectable } from '@nestjs/common';
import { IMessageRepository } from '../../domain/repository';
import { Criteria, Filter } from '../../../../shared/domain/criteria';
import { Optional } from '../../../../shared/domain/optional';
import { Message } from '../../../chat/domain/message/message';
import { InjectRepository } from '@nestjs/typeorm';
import { MessageEntity } from '../entities/message.entity';
import { Repository } from 'typeorm';
import { MessageMapper } from 'src/context/chat-context/chat/infrastructure/mappers/message.mapper';

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
    const { filters, limit, offset, orderBy, index } = criteria;
    console.log('criteria', criteria);
    const queryBuilder = this.repository.createQueryBuilder('message');

    // Aplicar filtros
    filters.forEach((filter) => {
      if (filter instanceof Filter) {
        queryBuilder.andWhere(
          `message.${String(filter.field)} ${String(filter.operator)} :value`,
          { value: filter.value },
        );
      }
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
      messages: entities.map((entity) => MessageMapper.toDomain(entity)),
    };
  }

  async findOne(
    criteria: Criteria<Message>,
  ): Promise<Optional<{ message: Message }>> {
    const { filters } = criteria;
    const queryBuilder = this.repository.createQueryBuilder('message');
    filters.forEach((filter) => {
      if (filter instanceof Filter) {
        queryBuilder.andWhere(
          `message.${String(filter.field)} ${String(filter.operator)} :value`,
          { value: filter.value },
        );
      }
    });
    const entity = await queryBuilder.getOne();
    return entity
      ? Optional.of({ message: MessageMapper.toDomain(entity) })
      : Optional.empty();
  }
}
