import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Criteria,
  Filter,
  FilterGroup,
  Operator,
} from 'src/context/shared/domain/criteria';
import { Optional } from 'src/context/shared/domain/optional';
import { Message } from '../domain/message';
import { MessageEntity } from './entities/message.entity';
import { MessageMapper } from './mappers/message.mapper';
import { IMessageRepository } from '../domain/message.repository';
import { err, ok, okVoid, Result } from 'src/context/shared/domain/result';
import { PaginateEndOfStreamError, SaveMessageError } from '../domain/errors';
import { ChatId } from '../../chat/domain/chat/value-objects/chat-id';

@Injectable()
export class TypeOrmMessageService implements IMessageRepository {
  constructor(
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
  ) {}
  async findOne(
    criteria: Criteria<Message>,
  ): Promise<Optional<{ message: Message }>> {
    const queryBuilder = this.messageRepository.createQueryBuilder('message');
    criteria.filters.forEach((filter) => {
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
        {
          value: filter.value,
        },
      );
    });
    const entity = await queryBuilder.getOne();
    return entity
      ? Optional.of({ message: MessageMapper.toDomain(entity) })
      : Optional.empty();
  }

  async save(message: Message): Promise<Result<void, SaveMessageError>> {
    const entity = MessageMapper.toEntity(message);
    try {
      await this.messageRepository.save(entity);
    } catch (error) {
      return err(new SaveMessageError(`Error saving message: ${error}`));
    }
    return okVoid();
  }

  async find(criteria: Criteria<Message>): Promise<{ messages: Message[] }> {
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

  // el index es un string que contiene el id (uuid) y la fecha de creación
  // ejemplo: "2023-03-30T12:34:56.789Z,123e4567-e89b-12d3-a456-426614174000"
  async findPaginated(
    chatId: ChatId,
    index: string,
    limit: number,
  ): Promise<
    Result<
      { messages: Message[]; total: number; index: string },
      PaginateEndOfStreamError
    >
  > {
    const queryBuilder = this.messageRepository.createQueryBuilder('message');
    queryBuilder.where('message.chatId = :chatId', { chatId: chatId.value });
    queryBuilder.orderBy('message.createdAt', 'DESC');
    queryBuilder.limit(limit);
    if (index) {
      const [createdAt, id] = index.split(',');
      queryBuilder.andWhere(
        '(message.createdAt < :createdAt OR (message.createdAt = :createdAt AND message.id < :id))',
        { createdAt, id },
      );
    }

    const entities = await queryBuilder.getMany();
    // .then((entities) => {
    //   return {
    //     messages: entities.map((entity) => MessageMapper.toDomain(entity)),
    //     total: entities.length,
    //     index: `${entities[entities.length - 1].createdAt.toISOString()},${entities[entities.length - 1].id}`,
    //   };
    // });
    const total = entities.length;
    if (total === 0) {
      return err(new PaginateEndOfStreamError());
    }

    return ok({
      messages: entities
        .map((entity) => MessageMapper.toDomain(entity))
        .reverse(),
      total,
      index: `${entities[entities.length - 1].createdAt.toISOString()},${entities[entities.length - 1].id}`,
    });
  }
}
