import { Test, TestingModule } from '@nestjs/testing';
import { FindOneUserBySocketIdQueryHandler } from '../find-one-user-by-socket-id.query-handler';
import { FindOneUserBySocketIdQuery } from '../find-one-user-by-socket-id.query';
import { ConnectionRepository, CONNECTION_REPOSITORY } from '../../../../domain/connection.repository';
import { ConnectionUser } from '../../../../domain/connection-user';
import { Criteria } from 'src/context/shared/domain/criteria';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { RepositoryError } from 'src/context/shared/domain/errors/repository.error';

describe('FindOneUserBySocketIdQueryHandler', () => {
  let handler: FindOneUserBySocketIdQueryHandler;
  let connectionRepository: jest.Mocked<ConnectionRepository>;

  const mockSocketId = 'socket-123';
  const mockConnectionUser = {
    toPrimitives: jest.fn().mockReturnValue({
      userId: 'user-123',
      socketId: mockSocketId,
      roles: ['visitor'],
      isConnected: true,
    }),
  } as any as ConnectionUser;

  beforeEach(async () => {
    const mockConnectionRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindOneUserBySocketIdQueryHandler,
        {
          provide: CONNECTION_REPOSITORY,
          useValue: mockConnectionRepository,
        },
      ],
    }).compile();

    handler = module.get<FindOneUserBySocketIdQueryHandler>(FindOneUserBySocketIdQueryHandler);
    connectionRepository = module.get(CONNECTION_REPOSITORY);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return user when connection is found by socket ID', async () => {
      // Arrange
      const query = new FindOneUserBySocketIdQuery(mockSocketId);
      connectionRepository.findOne.mockResolvedValue(ok(mockConnectionUser));

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual({
        user: {
          userId: 'user-123',
          socketId: mockSocketId,
          roles: ['visitor'],
          isConnected: true,
        },
      });
      expect(connectionRepository.findOne).toHaveBeenCalledWith(
        expect.any(Criteria),
      );
      expect(mockConnectionUser.toPrimitives).toHaveBeenCalled();
    });

    it('should return empty object when connection is not found', async () => {
      // Arrange
      const query = new FindOneUserBySocketIdQuery(mockSocketId);
      connectionRepository.findOne.mockResolvedValue(err(new RepositoryError('Connection not found')));

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual({});
      expect(connectionRepository.findOne).toHaveBeenCalledWith(
        expect.any(Criteria),
      );
      expect(mockConnectionUser.toPrimitives).not.toHaveBeenCalled();
    });

    it('should use correct criteria with socket ID filter', async () => {
      // Arrange
      const query = new FindOneUserBySocketIdQuery(mockSocketId);
      connectionRepository.findOne.mockResolvedValue(err(new RepositoryError('Not found')));

      // Act
      await handler.execute(query);

      // Assert
      const expectedCriteria = expect.objectContaining({
        filters: expect.arrayContaining([
          expect.objectContaining({
            field: 'socketId',
            value: mockSocketId,
          }),
        ]),
      });
      expect(connectionRepository.findOne).toHaveBeenCalledWith(expectedCriteria);
    });

    it('should handle repository errors gracefully', async () => {
      // Arrange
      const query = new FindOneUserBySocketIdQuery(mockSocketId);
      connectionRepository.findOne.mockRejectedValue(new Error('Database connection error'));

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('Database connection error');
      expect(connectionRepository.findOne).toHaveBeenCalledWith(expect.any(Criteria));
    });
  });
});