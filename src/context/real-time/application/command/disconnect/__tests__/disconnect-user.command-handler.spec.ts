import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisher } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { DisconnectUserCommandHandler } from '../disconnect-user.command-handler';
import { DisconnectUserCommand } from '../disconnect-user.command';
import {
  ConnectionRepository,
  CONNECTION_REPOSITORY,
} from '../../../../domain/connection.repository';
import { INotification, NOTIFICATION } from '../../../../domain/notification';
import { ConnectionUserId } from '../../../../domain/value-objects/connection-user-id';
import { Criteria } from 'src/context/shared/domain/criteria';
import { ok, err } from 'src/context/shared/domain/result';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import { RepositoryError } from 'src/context/shared/domain/errors/repository.error';

describe('DisconnectUserCommandHandler', () => {
  let handler: DisconnectUserCommandHandler;
  let connectionRepository: jest.Mocked<ConnectionRepository>;
  let eventPublisher: jest.Mocked<EventPublisher>;
  let notification: jest.Mocked<INotification>;

  const mockUserId = Uuid.generate();
  let mockConnectionUser: any;

  beforeEach(async () => {
    mockConnectionUser = {
      userId: new ConnectionUserId(mockUserId),
      disconnect: jest.fn(),
    };

    const mockConnectionRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const mockEventPublisher = {
      mergeObjectContext: jest.fn().mockReturnValue({
        commit: jest.fn(),
      }),
    };

    const mockNotification = {
      notify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisconnectUserCommandHandler,
        {
          provide: CONNECTION_REPOSITORY,
          useValue: mockConnectionRepository,
        },
        {
          provide: EventPublisher,
          useValue: mockEventPublisher,
        },
        {
          provide: NOTIFICATION,
          useValue: mockNotification,
        },
      ],
    }).compile();

    handler = module.get<DisconnectUserCommandHandler>(
      DisconnectUserCommandHandler,
    );
    connectionRepository = module.get(CONNECTION_REPOSITORY);
    eventPublisher = module.get(EventPublisher);
    notification = module.get(NOTIFICATION);

    // Mock logger to avoid console output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const command = new DisconnectUserCommand(mockUserId);

    it('should disconnect user successfully when connection exists', async () => {
      // Arrange
      const disconnectedConnection = { ...mockConnectionUser };
      mockConnectionUser.disconnect.mockReturnValue(disconnectedConnection);
      connectionRepository.findOne.mockResolvedValue(ok(mockConnectionUser));
      connectionRepository.save.mockResolvedValue(undefined);

      // Act
      await handler.execute(command);

      // Assert
      expect(connectionRepository.findOne).toHaveBeenCalledWith(
        expect.any(Criteria),
      );
      expect(mockConnectionUser.disconnect).toHaveBeenCalled();
      expect(connectionRepository.save).toHaveBeenCalledWith(
        disconnectedConnection,
      );
      expect(eventPublisher.mergeObjectContext).toHaveBeenCalledWith(
        disconnectedConnection,
      );
      expect(notification.notify).toHaveBeenCalledWith({
        recipientId: mockUserId,
        type: 'visitor:disconnected',
        payload: {
          userId: mockUserId,
        },
      });
    });

    it('should handle case when connection is not found', async () => {
      // Arrange
      connectionRepository.findOne.mockResolvedValue(
        err(new RepositoryError('Connection not found')),
      );

      // Act
      await handler.execute(command);

      // Assert
      expect(connectionRepository.findOne).toHaveBeenCalledWith(
        expect.any(Criteria),
      );
      expect(mockConnectionUser.disconnect).not.toHaveBeenCalled();
      expect(connectionRepository.save).not.toHaveBeenCalled();
      expect(notification.notify).toHaveBeenCalledWith({
        recipientId: mockUserId,
        type: 'visitor:disconnected',
        payload: {
          userId: mockUserId,
        },
      });
    });

    it('should handle repository save errors gracefully', async () => {
      // Arrange
      const disconnectedConnection = { ...mockConnectionUser };
      mockConnectionUser.disconnect.mockReturnValue(disconnectedConnection);
      connectionRepository.findOne.mockResolvedValue(ok(mockConnectionUser));
      connectionRepository.save.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Database error');
      expect(connectionRepository.findOne).toHaveBeenCalled();
      expect(mockConnectionUser.disconnect).toHaveBeenCalled();
      expect(connectionRepository.save).toHaveBeenCalledWith(
        disconnectedConnection,
      );
    });

    it('should handle notification errors gracefully', async () => {
      // Arrange
      const disconnectedConnection = { ...mockConnectionUser };
      mockConnectionUser.disconnect.mockReturnValue(disconnectedConnection);
      connectionRepository.findOne.mockResolvedValue(ok(mockConnectionUser));
      connectionRepository.save.mockResolvedValue(undefined);
      notification.notify.mockRejectedValue(new Error('Notification error'));

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        'Notification error',
      );
      expect(notification.notify).toHaveBeenCalledWith({
        recipientId: mockUserId,
        type: 'visitor:disconnected',
        payload: {
          userId: mockUserId,
        },
      });
    });
  });
});
