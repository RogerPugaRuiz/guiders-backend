/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Test, TestingModule } from '@nestjs/testing';
import { NewMessageUseCase, NewMessageRequest } from './new-message.usecase';
import {
  IMessageRepository,
  MESSAGE_REPOSITORY,
} from '../../domain/repository';
import { EventPublisher, QueryBus } from '@nestjs/cqrs';
import { ExistsChatQuery } from '../../../chat/application/queries/exists-chat.query';
import { faker } from '@faker-js/faker';

describe('NewMessageUseCase', () => {
  let useCase: NewMessageUseCase;
  let repository: IMessageRepository;
  let publisher: EventPublisher;
  let queryBus: QueryBus;

  const mockRepository = {
    save: jest.fn(),
  };
  const commitFn = jest.fn();
  const mockPublisher = {
    mergeObjectContext: jest.fn().mockReturnValue({ commit: commitFn }),
  };
  const mockQueryBus = {
    execute: jest.fn().mockResolvedValue({ exists: true }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewMessageUseCase,
        { provide: MESSAGE_REPOSITORY, useValue: mockRepository },
        { provide: EventPublisher, useValue: mockPublisher },
        { provide: QueryBus, useValue: mockQueryBus },
      ],
    }).compile();

    useCase = module.get<NewMessageUseCase>(NewMessageUseCase);
    repository = module.get<IMessageRepository>(MESSAGE_REPOSITORY);
    publisher = module.get<EventPublisher>(EventPublisher);
    queryBus = module.get<QueryBus>(QueryBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should save message and commit context when chat exists', async () => {
    const request: NewMessageRequest = {
      chatId: faker.string.uuid(),
      senderId: faker.string.uuid(),
      content: faker.lorem.sentence(),
    };

    await useCase.execute(request);

    // Verificar que se consulta si el chat existe
    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(ExistsChatQuery));

    // Verificar que se guarda el mensaje
    expect(repository.save).toHaveBeenCalled();

    // Verificar que se mergea y se comitea el contexto de la entidad
    expect(publisher.mergeObjectContext).toHaveBeenCalled();
    expect(commitFn).toHaveBeenCalled();
  });

  it('should throw an error when chat does not exist', async () => {
    // Simular que el chat no existe.
    (queryBus.execute as jest.Mock).mockResolvedValueOnce({ exists: false });
    const request: NewMessageRequest = {
      chatId: faker.string.uuid(),
      senderId: faker.string.uuid(),
      content: faker.lorem.sentence(),
    };

    await expect(useCase.execute(request)).rejects.toThrow(
      'Chat does not exists',
    );
  });
});
