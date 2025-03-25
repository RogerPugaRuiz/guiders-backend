/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmMessageRepository } from './type-orm-message-repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MessageEntity } from '../entities/message.entity';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { MessageMapper } from '../mappers/message.mapper';
import { MessageMother } from '../../domain/mothers/message-mother';
import { Criteria, Operator } from '../../../../shared/domain/criteria';
import { Message } from '../../domain/message';

describe('TypeOrmMessageRepository', () => {
  let repository: TypeOrmMessageRepository;
  let ormRepository: Repository<MessageEntity>;

  const mockRepository = {
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  } as unknown as Repository<MessageEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TypeOrmMessageRepository,
        {
          provide: getRepositoryToken(MessageEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    repository = module.get<TypeOrmMessageRepository>(TypeOrmMessageRepository);
    ormRepository = module.get<Repository<MessageEntity>>(
      getRepositoryToken(MessageEntity),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe guardar un message correctamente', async () => {
    const message = MessageMother.random();
    const { id, chatId, senderId, content, createdAt } = message.toPrimitives();
    const entity: MessageEntity = {
      id: id,
      chatId: chatId,
      senderId: senderId,
      content: content,
      createdAt: createdAt,
    };
    jest.spyOn(MessageMapper, 'toEntity').mockReturnValue(entity);

    await repository.save(message);

    expect(MessageMapper.toEntity).toHaveBeenCalledWith(message);
    expect(ormRepository.save).toHaveBeenCalledWith(entity);
  });

  it('debe encontrar mensajes con criterio dado', async () => {
    const message = MessageMother.random();
    const { id, chatId, senderId, content, createdAt } = message.toPrimitives();
    const entity = { id, chatId, senderId, content, createdAt };
    jest.spyOn(MessageMapper, 'toDomain').mockReturnValue(message);

    const qb = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(entity),
      getMany: jest.fn().mockResolvedValue([entity]),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<SelectQueryBuilder<MessageEntity>>;
    jest.spyOn(ormRepository, 'createQueryBuilder').mockReturnValue(qb);
    const numOffset = 1;
    const numLimit = 10;
    const criteria = new Criteria<Message>()
      .addFilter('chatId', Operator.EQUALS, chatId)
      .orderByField('createdAt', 'DESC')
      .setLimit(numLimit)
      .setOffset(numOffset);

    const result = await repository.find(criteria);
    expect(qb.andWhere).toHaveBeenCalled();
    expect(qb.orderBy).toHaveBeenCalled();
    expect(qb.limit).toHaveBeenCalled();
    expect(qb.offset).toHaveBeenCalled();
    expect(result.messages).toEqual([message]);
  });

  it('debe encontrar un mensaje con findOne', async () => {
    const message = MessageMother.random();
    const { id, chatId, senderId, content, createdAt } = message.toPrimitives();
    const entity = { id, chatId, senderId, content, createdAt };
    jest.spyOn(MessageMapper, 'toDomain').mockReturnValue(message);

    const qb = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(entity),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<SelectQueryBuilder<MessageEntity>>;

    jest.spyOn(ormRepository, 'createQueryBuilder').mockReturnValue(qb);

    const criteria = new Criteria<Message>().addFilter(
      'id',
      Operator.EQUALS,
      id,
    );

    const result = await repository.findOne(criteria);
    expect(qb.andWhere).toHaveBeenCalled();
    expect(result.isPresent()).toBeTruthy();
    expect(result.get().message).toEqual(message);
  });

  it('debe retornar Optional.empty si findOne no encuentra mensaje', async () => {
    const qb = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null), // Corrección: usar getOne y retornar null
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<SelectQueryBuilder<MessageEntity>>;
    jest.spyOn(ormRepository, 'createQueryBuilder').mockReturnValue(qb);

    const criteria = new Criteria<Message>().addFilter(
      'chatId',
      Operator.EQUALS,
      'invalid-id',
    );

    const result = await repository.findOne(criteria);
    expect(qb.andWhere).toHaveBeenCalled();
    expect(!result.isPresent()).toBeTruthy();
  });
});
