import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { StartTypingCommandHandler } from '../start-typing.command-handler';
import { StartTypingCommand } from '../start-typing.command';
import { COMMERCIAL_CONNECTION_DOMAIN_SERVICE } from '../../../../commercial/domain/commercial-connection.domain-service';
import { VISITOR_CONNECTION_DOMAIN_SERVICE } from '../../../../visitors-v2/domain/visitor-connection.domain-service';
import { TypingStartedEvent } from '../../../domain/events/typing-started.event';

describe('StartTypingCommandHandler', () => {
  let handler: StartTypingCommandHandler;
  let mockCommercialService: any;
  let mockVisitorService: any;
  let mockEventBus: any;

  beforeEach(async () => {
    mockCommercialService = {
      setTyping: jest.fn().mockResolvedValue(undefined),
    };

    mockVisitorService = {
      setTyping: jest.fn().mockResolvedValue(undefined),
    };

    mockEventBus = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StartTypingCommandHandler,
        {
          provide: COMMERCIAL_CONNECTION_DOMAIN_SERVICE,
          useValue: mockCommercialService,
        },
        {
          provide: VISITOR_CONNECTION_DOMAIN_SERVICE,
          useValue: mockVisitorService,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    handler = module.get<StartTypingCommandHandler>(StartTypingCommandHandler);
  });

  describe('execute', () => {
    it('should set typing for commercial user', async () => {
      const commercialId = '123e4567-e89b-12d3-a456-426614174001';
      const command = new StartTypingCommand(
        'chat-123',
        commercialId,
        'commercial',
      );

      await handler.execute(command);

      expect(mockCommercialService.setTyping).toHaveBeenCalledWith(
        expect.objectContaining({ value: commercialId }),
        'chat-123',
      );
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.any(TypingStartedEvent),
      );
    });

    it('should set typing for visitor user', async () => {
      const visitorId = '223e4567-e89b-12d3-a456-426614174002';
      const command = new StartTypingCommand('chat-789', visitorId, 'visitor');

      await handler.execute(command);

      expect(mockVisitorService.setTyping).toHaveBeenCalledWith(
        expect.objectContaining({
          value: visitorId,
        }),
        'chat-789',
      );
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.any(TypingStartedEvent),
      );
    });

    it('should publish TypingStartedEvent with correct data', async () => {
      const userId = '323e4567-e89b-12d3-a456-426614174003';
      const command = new StartTypingCommand('chat-123', userId, 'commercial');

      await handler.execute(command);

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: {
            chatId: 'chat-123',
            userId: userId,
            userType: 'commercial',
          },
        }),
      );
    });

    it('should throw error if setTyping fails', async () => {
      const commercialId = '423e4567-e89b-12d3-a456-426614174004';
      mockCommercialService.setTyping.mockRejectedValue(
        new Error('Redis error'),
      );

      const command = new StartTypingCommand(
        'chat-123',
        commercialId,
        'commercial',
      );

      await expect(handler.execute(command)).rejects.toThrow('Redis error');
    });
  });
});
