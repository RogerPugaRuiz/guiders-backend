import { Test } from '@nestjs/testing';
import {
  ClearVisitorChatsCommand,
  ClearVisitorChatsResult,
} from '../clear-visitor-chats.command';
import { ClearVisitorChatsCommandHandler } from '../clear-visitor-chats.command-handler';
import {
  CHAT_V2_REPOSITORY,
  IChatRepository,
} from '../../../domain/chat.repository';
import { ok } from 'src/context/shared/domain/result';

describe('ClearVisitorChatsCommandHandler', () => {
  let handler: ClearVisitorChatsCommandHandler;
  let repository: jest.Mocked<IChatRepository>;

  beforeEach(async () => {
    repository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      findOne: jest.fn(),
      match: jest.fn(),
      findByCommercialId: jest.fn(),
      findByVisitorId: jest.fn(),
      getPendingQueue: jest.fn(),
      getAvailableChats: jest.fn(),
      findByDateRange: jest.fn(),
      countByStatus: jest.fn(),
      getCommercialMetrics: jest.fn(),
      findWithUnreadMessages: jest.fn(),
      findByDepartment: jest.fn(),
      findOverdueChats: jest.fn(),
      getResponseTimeStats: jest.fn(),
      countPendingCreatedBefore: jest.fn(),
      deleteByVisitorId: jest.fn(),
    } as unknown as jest.Mocked<IChatRepository>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        ClearVisitorChatsCommandHandler,
        { provide: CHAT_V2_REPOSITORY, useValue: repository },
      ],
    }).compile();

    handler = moduleRef.get(ClearVisitorChatsCommandHandler);
  });

  it('elimina chats y retorna deletedCount', async () => {
    repository.deleteByVisitorId.mockResolvedValue(ok(5));
    // UUID válido para pasar validación de VisitorId
    const command = new ClearVisitorChatsCommand(
      '550e8400-e29b-41d4-a716-446655440000',
      'admin-1',
    );

    const result: ClearVisitorChatsResult = await handler.execute(command);

    expect(result.deletedCount).toBe(5);
    expect(result.visitorId).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(repository.deleteByVisitorId).toHaveBeenCalled();
  });
});
