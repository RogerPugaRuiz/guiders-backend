import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { OnVisitorCreatedUpdateParticipantNameEventHandler } from '../on-visitor-created-update-participant-name.event-handler';
import { VisitorCreatedEvent } from '../../../domain/events/visitor-created-event';
import { UpdateParticipantNameCommand } from 'src/context/conversations/chat/application/update/participants/name/update-participant-name.command';
import { VisitorPrimitives } from '../../../domain/visitor';

describe('OnVisitorCreatedUpdateParticipantNameEventHandler', () => {
  let handler: OnVisitorCreatedUpdateParticipantNameEventHandler;
  let mockCommandBus: jest.Mocked<CommandBus>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnVisitorCreatedUpdateParticipantNameEventHandler,
        {
          provide: CommandBus,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<OnVisitorCreatedUpdateParticipantNameEventHandler>(
      OnVisitorCreatedUpdateParticipantNameEventHandler,
    );
    mockCommandBus = module.get<CommandBus>(
      CommandBus,
    ) as jest.Mocked<CommandBus>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should send UpdateParticipantNameCommand when visitor has a name', async () => {
      // Arrange
      const visitorPrimitive: VisitorPrimitives = {
        id: 'visitor-123',
        name: 'Brave Lion',
        email: null,
        tel: null,
        tags: [],
        notes: [],
        currentPage: null,
        connectionTime: null,
      };

      const event = new VisitorCreatedEvent({
        visitor: visitorPrimitive,
      });

      // Act
      await handler.handle(event);

      // Assert
      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
      expect(mockCommandBus.execute).toHaveBeenCalledWith(
        new UpdateParticipantNameCommand('visitor-123', 'Brave Lion'),
      );
    });

    it('should not send command when visitor has no name', async () => {
      // Arrange
      const visitorPrimitive: VisitorPrimitives = {
        id: 'visitor-456',
        name: null,
        email: null,
        tel: null,
        tags: [],
        notes: [],
        currentPage: null,
        connectionTime: null,
      };

      const event = new VisitorCreatedEvent({
        visitor: visitorPrimitive,
      });

      // Act
      await handler.handle(event);

      // Assert
      expect(mockCommandBus.execute).not.toHaveBeenCalled();
    });

    it('should not send command when visitor has empty name', async () => {
      // Arrange
      const visitorPrimitive: VisitorPrimitives = {
        id: 'visitor-789',
        name: '',
        email: null,
        tel: null,
        tags: [],
        notes: [],
        currentPage: null,
        connectionTime: null,
      };

      const event = new VisitorCreatedEvent({
        visitor: visitorPrimitive,
      });

      // Act
      await handler.handle(event);

      // Assert
      expect(mockCommandBus.execute).not.toHaveBeenCalled();
    });

    it('should handle command bus errors gracefully', async () => {
      // Arrange
      const visitorPrimitive: VisitorPrimitives = {
        id: 'visitor-error',
        name: 'Error Name',
        email: null,
        tel: null,
        tags: [],
        notes: [],
        currentPage: null,
        connectionTime: null,
      };

      const event = new VisitorCreatedEvent({
        visitor: visitorPrimitive,
      });

      mockCommandBus.execute.mockRejectedValue(new Error('Command failed'));

      // Act & Assert - should not throw, error should be logged
      await expect(handler.handle(event)).resolves.not.toThrow();
      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
    });
  });
});
