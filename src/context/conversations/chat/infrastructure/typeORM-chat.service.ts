import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
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
    // Crear query builder con joins necesarios para obtener participantes
    const queryBuilder = this.chatRepository
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.participants', 'participants');

    // Aplicar filtros del criteria
    this.applyCriteriaFilters(queryBuilder, criteria);

    // Aplicar ordenamiento del criteria
    this.applyCriteriaOrderBy(queryBuilder, criteria);

    // Ejecutar la consulta para obtener solo un resultado
    const entity = await queryBuilder.getOne();

    if (!entity) {
      return Optional.empty();
    }

    // Convertir la entidad a dominio usando el mapper
    const chat = await ChatMapper.toDomain(entity, this.chatMessageEncryptor);
    return Optional.of({ chat });
  }

  async find(criteria: Criteria<Chat>): Promise<{ chats: Chat[] }> {
    // Crear query builder con joins necesarios para obtener participantes
    const queryBuilder = this.chatRepository
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.participants', 'participants');

    // Aplicar filtros del criteria
    this.applyCriteriaFilters(queryBuilder, criteria);

    // Aplicar ordenamiento del criteria
    this.applyCriteriaOrderBy(queryBuilder, criteria);

    // Aplicar cursor si existe (para paginación)
    this.applyCriteriaCursor(queryBuilder, criteria);

    // Aplicar límite si existe
    if (criteria.limit !== undefined) {
      queryBuilder.limit(criteria.limit);
    }

    // Aplicar offset si existe
    if (criteria.offset !== undefined) {
      queryBuilder.offset(criteria.offset);
    }

    // Ejecutar la consulta
    const entities = await queryBuilder.getMany();

    // Convertir todas las entidades a dominio usando el mapper
    const chats = await Promise.all(
      entities.map((entity) =>
        ChatMapper.toDomain(entity, this.chatMessageEncryptor),
      ),
    );

    return { chats };
  }

  /**
   * Aplica los filtros del criteria al query builder de TypeORM
   * Maneja filtros simples y grupos de filtros con operadores lógicos
   */
  private applyCriteriaFilters(
    queryBuilder: SelectQueryBuilder<ChatEntity>,
    criteria: Criteria<Chat>,
  ): void {
    if (!criteria.filters || criteria.filters.length === 0) {
      return;
    }

    let parameterIndex = 0;

    criteria.filters.forEach((filterOrGroup) => {
      if (filterOrGroup instanceof Filter) {
        const { whereClause, parameterName, parameterValue } =
          this.buildFilterClause(filterOrGroup, parameterIndex);

        if (parameterIndex === 0) {
          queryBuilder.where(whereClause, { [parameterName]: parameterValue });
        } else {
          queryBuilder.andWhere(whereClause, {
            [parameterName]: parameterValue,
          });
        }
        parameterIndex++;
      } else if (filterOrGroup instanceof FilterGroup) {
        const groupClause = this.buildFilterGroupClause(
          filterOrGroup,
          parameterIndex,
        );

        if (parameterIndex === 0) {
          queryBuilder.where(groupClause.clause, groupClause.parameters);
        } else {
          queryBuilder.andWhere(groupClause.clause, groupClause.parameters);
        }
        parameterIndex += groupClause.parameterCount;
      }
    });
  }

  /**
   * Construye la cláusula WHERE para un filtro individual
   */
  private buildFilterClause(
    filter: Filter<Chat>,
    parameterIndex: number,
  ): { whereClause: string; parameterName: string; parameterValue: unknown } {
    const parameterName = `param${parameterIndex}`;
    let field = String(filter.field);
    let whereClause: string;

    // Mapear campos de dominio a campos de base de datos
    switch (filter.field) {
      case 'participants':
        // Para buscar por participante, necesitamos hacer join con la tabla de participantes
        field = 'participants.id';
        break;
      case 'lastMessageAt':
        field = 'chat.lastMessageAt';
        break;
      case 'id':
        field = 'chat.id';
        break;
      case 'companyId':
        field = 'chat.companyId';
        break;
      case 'status':
        field = 'chat.status';
        break;
      case 'createdAt':
        field = 'chat.createdAt';
        break;
      default:
        field = `chat.${String(filter.field)}`;
    }

    // Construir la cláusula WHERE según el operador
    switch (filter.operator) {
      case Operator.EQUALS:
        whereClause = `${field} = :${parameterName}`;
        break;
      case Operator.NOT_EQUALS:
        whereClause = `${field} != :${parameterName}`;
        break;
      case Operator.GREATER_THAN:
        whereClause = `${field} > :${parameterName}`;
        break;
      case Operator.LESS_THAN:
        whereClause = `${field} < :${parameterName}`;
        break;
      case Operator.GREATER_OR_EQUALS:
        whereClause = `${field} >= :${parameterName}`;
        break;
      case Operator.LESS_OR_EQUALS:
        whereClause = `${field} <= :${parameterName}`;
        break;
      case Operator.LIKE:
        whereClause = `${field} LIKE :${parameterName}`;
        break;
      case Operator.IN:
        whereClause = `${field} IN (:...${parameterName})`;
        break;
      case Operator.NOT_IN:
        whereClause = `${field} NOT IN (:...${parameterName})`;
        break;
      case Operator.IS_NULL:
        whereClause = `${field} IS NULL`;
        break;
      case Operator.IS_NOT_NULL:
        whereClause = `${field} IS NOT NULL`;
        break;
      default:
        whereClause = `${field} = :${parameterName}`;
    }

    return {
      whereClause,
      parameterName,
      parameterValue: filter.value,
    };
  }

  /**
   * Construye la cláusula WHERE para un grupo de filtros
   */
  private buildFilterGroupClause(
    filterGroup: FilterGroup<Chat>,
    startIndex: number,
  ): {
    clause: string;
    parameters: Record<string, unknown>;
    parameterCount: number;
  } {
    const clauses: string[] = [];
    const parameters: Record<string, unknown> = {};
    let parameterIndex = startIndex;

    filterGroup.filters.forEach((filterOrNestedGroup) => {
      if (filterOrNestedGroup instanceof Filter) {
        const { whereClause, parameterName, parameterValue } =
          this.buildFilterClause(filterOrNestedGroup, parameterIndex);
        clauses.push(whereClause);
        parameters[parameterName] = parameterValue;
        parameterIndex++;
      } else if (filterOrNestedGroup instanceof FilterGroup) {
        const nestedGroup = this.buildFilterGroupClause(
          filterOrNestedGroup,
          parameterIndex,
        );
        clauses.push(`(${nestedGroup.clause})`);
        Object.assign(parameters, nestedGroup.parameters);
        parameterIndex += nestedGroup.parameterCount;
      }
    });

    const operator = filterGroup.operator === 'OR' ? ' OR ' : ' AND ';
    const clause = clauses.join(operator);

    return {
      clause: `(${clause})`,
      parameters,
      parameterCount: parameterIndex - startIndex,
    };
  }

  /**
   * Aplica el ordenamiento del criteria al query builder
   */
  private applyCriteriaOrderBy(
    queryBuilder: SelectQueryBuilder<ChatEntity>,
    criteria: Criteria<Chat>,
  ): void {
    if (!criteria.orderBy) {
      return;
    }

    const orderByList = Array.isArray(criteria.orderBy)
      ? criteria.orderBy
      : [criteria.orderBy];

    orderByList.forEach((orderBy, index) => {
      let field = String(orderBy.field);

      // Mapear campos de dominio a campos de base de datos
      switch (orderBy.field) {
        case 'lastMessageAt':
          field = 'chat.lastMessageAt';
          break;
        case 'id':
          field = 'chat.id';
          break;
        case 'companyId':
          field = 'chat.companyId';
          break;
        case 'status':
          field = 'chat.status';
          break;
        case 'createdAt':
          field = 'chat.createdAt';
          break;
        default:
          field = `chat.${String(orderBy.field)}`;
      }

      if (index === 0) {
        queryBuilder.orderBy(field, orderBy.direction);
      } else {
        queryBuilder.addOrderBy(field, orderBy.direction);
      }
    });
  }

  /**
   * Aplica el cursor del criteria al query builder para paginación
   */
  private applyCriteriaCursor(
    queryBuilder: SelectQueryBuilder<ChatEntity>,
    criteria: Criteria<Chat>,
  ): void {
    if (!criteria.cursor) {
      return;
    }

    // Para el caso específico de find-chat-list que usa lastMessageAt e id como cursor
    if ('lastMessageAt' in criteria.cursor && 'id' in criteria.cursor) {
      const { lastMessageAt, id } = criteria.cursor;

      if (lastMessageAt !== null) {
        queryBuilder.andWhere(
          '(chat.lastMessageAt < :cursorLastMessageAt OR (chat.lastMessageAt = :cursorLastMessageAt AND chat.id < :cursorId))',
          {
            cursorLastMessageAt: lastMessageAt,
            cursorId: id,
          },
        );
      } else {
        // Si lastMessageAt es null, solo usar id para el cursor
        queryBuilder.andWhere('chat.id < :cursorId', { cursorId: id });
      }
    }
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
    // Crear criteria con filtro por ID
    const criteria = new Criteria<Chat>([
      new Filter<Chat>('id', Operator.EQUALS, id.value),
    ]);

    // Usar el método findOne con el criteria
    return this.findOne(criteria);
  }

  async findAll(): Promise<{ chats: Chat[] }> {
    // Crear criteria vacío para obtener todos los chats
    const criteria = new Criteria<Chat>();

    // Usar el método find con el criteria
    return this.find(criteria);
  }
}
