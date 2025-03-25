/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import {
  GetMessageByChatUseCase,
  GetMessageByChatUseCaseRequest,
} from './get-message-by-chat.usecase';
import {
  IMessageRepository,
  MESSAGE_REPOSITORY,
} from '../../domain/repository';
import { Optional } from '../../../../shared/domain/optional';

describe('GetMessageByChatUseCase', () => {
  let useCase: GetMessageByChatUseCase;
  let repository: IMessageRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetMessageByChatUseCase,
        {
          provide: MESSAGE_REPOSITORY,
          useValue: {
            find: jest.fn().mockReturnValue({ messages: [] }),
            findOne: jest.fn().mockReturnValue(Optional.empty()),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get<GetMessageByChatUseCase>(GetMessageByChatUseCase);
    repository = module.get<IMessageRepository>(MESSAGE_REPOSITORY);
  });

  it('debe retornar los mensajes filtrados por chatId con limit y offset', async () => {
    const request: GetMessageByChatUseCaseRequest = {
      chatId: 'chat-123',
      limit: 10,
      offset: 0,
    };
    const expectedMessages = [{ id: 'message1' }, { id: 'message2' }];
    (repository.find as jest.Mock).mockResolvedValue({
      messages: expectedMessages,
    });

    const result = await useCase.execute(request);

    expect(repository.find).toHaveBeenCalled();
    expect(result).toEqual({ messages: expectedMessages });
  });
});
