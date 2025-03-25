import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmMessageRepository } from './type-orm-message-repository';
import { MessageEntity } from '../entities/message.entity';
import { Message } from '../../domain/message';
import { MessageMother } from '../../domain/mothers/message-mother';
import { Criteria, Operator } from '../../../../shared/domain/criteria';
import { Repository } from 'typeorm';

describe('TypeOrmMessageRepository (Integration)', () => {
  jest.setTimeout(10000); // 10 segundos
  let repository: TypeOrmMessageRepository;
  let ormRepository: Repository<MessageEntity>;

  const messages: Message[] = [];

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: 5433,
          username: 'postgres',
          password: 'postgres',
          database: 'guiders_test',
          entities: [__dirname + '../../**/*.entity{.ts,.js}'],
          synchronize: true, // Solo para desarrollo
        }),
        TypeOrmModule.forFeature([MessageEntity]),
      ],
      providers: [TypeOrmMessageRepository],
    }).compile();

    repository = module.get<TypeOrmMessageRepository>(TypeOrmMessageRepository);
    ormRepository = module.get<Repository<MessageEntity>>(
      getRepositoryToken(MessageEntity),
    );
  });

  afterAll(async () => {
    jest.clearAllMocks();
    await ormRepository.clear();
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    // crea una batería de objetos de prueba
    const numberOfMessages = 10;
    for (let i = 0; i < numberOfMessages; i++) {
      const message = MessageMother.random();
      await repository.save(message);
      messages.push(message);
    }
  });

  afterEach(async () => {
    // elimina todos los mensajes de la base de datos
    await ormRepository.clear();
    messages.length = 0;
  });

  it('debe guardar y recuperar un mensaje correctamente', async () => {
    const message = MessageMother.random();
    await repository.save(message);

    const criteria = new Criteria<Message>().addFilter(
      'id',
      Operator.EQUALS,
      message.id.value,
    );

    const result = await repository.findOne(criteria);

    expect(result.isPresent()).toBeTruthy();
  });

  it('debe retornar Optional.empty si no encuentra un mensaje', async () => {
    const criteria = new Criteria<Message>().addFilter(
      'id',
      Operator.EQUALS,
      '00000000-0000-0000-0000-000000000000',
    );

    const result = await repository.findOne(criteria);

    expect(result.isPresent()).toBeFalsy();
  });
  it('debe retornar un mensaje por id', async () => {
    const message = messages[0];
    const criteria = new Criteria<Message>().addFilter(
      'id',
      Operator.EQUALS,
      message.id.value,
    );
    const optional = await repository.findOne(criteria);
    expect(optional.isPresent()).toBeTruthy();
    const resultMessage = optional.get().message;
    expect(resultMessage).toEqual(message);
  });

  it('debe retornar todos los mensajes', async () => {
    const { messages: resultMessage } = await repository.find(
      new Criteria<Message>(),
    );

    expect(resultMessage).toEqual(messages);
  });

  it('debe retornar un conjunto de mensajes filtrados por chatId, ordenados, limitados y paginados', async () => {
    const message = messages[0];
    const criteria = new Criteria<Message>()
      .addFilter('chatId', Operator.EQUALS, message.chatId.value)
      .orderByField('createdAt', 'DESC')
      .setLimit(2)
      .setOffset(2);

    const { messages: resultMessage } = await repository.find(criteria);
    const expectedMessages = messages
      .filter((m) => m.chatId.value === message.chatId.value)
      .sort((a, b) => b.createdAt.value.getTime() - a.createdAt.value.getTime())
      .slice(2, 4);
    expect(resultMessage).toEqual(expectedMessages);
  });
});
