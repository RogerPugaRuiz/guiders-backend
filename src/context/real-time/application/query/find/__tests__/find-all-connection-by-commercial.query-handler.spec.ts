import { Test, TestingModule } from '@nestjs/testing';
import { FindAllConnectionByCommercialQueryHandler } from '../find-all-connection-by-commercial.query-handler';
import { FindAllConnectionByCommercialQuery } from '../find-all-connection-by-commercial.query';
import { ConnectionRepository, CONNECTION_REPOSITORY } from '../../../../domain/connection.repository';
import { ConnectionUser } from '../../../../domain/connection-user';
import { ConnectionRole } from '../../../../domain/value-objects/connection-role';
import { Criteria } from 'src/context/shared/domain/criteria';

describe('FindAllConnectionByCommercialQueryHandler', () => {
  let handler: FindAllConnectionByCommercialQueryHandler;
  let connectionRepository: jest.Mocked<ConnectionRepository>;

  const mockCommercialConnection = {
    hasRole: jest.fn().mockReturnValue(true),
  } as any as ConnectionUser;

  const mockVisitorConnection = {
    hasRole: jest.fn().mockReturnValue(false),
  } as any as ConnectionUser;

  beforeEach(async () => {
    const mockConnectionRepository = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindAllConnectionByCommercialQueryHandler,
        {
          provide: CONNECTION_REPOSITORY,
          useValue: mockConnectionRepository,
        },
      ],
    }).compile();

    handler = module.get<FindAllConnectionByCommercialQueryHandler>(FindAllConnectionByCommercialQueryHandler);
    connectionRepository = module.get(CONNECTION_REPOSITORY);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return commercial connections when found', async () => {
      // Arrange
      const query = new FindAllConnectionByCommercialQuery();
      const allConnections = [mockCommercialConnection, mockVisitorConnection];
      connectionRepository.find.mockResolvedValue(allConnections);

      // Act
      const result = await handler.execute();

      // Assert
      expect(result).toEqual([mockCommercialConnection]);
      expect(connectionRepository.find).toHaveBeenCalledWith(
        expect.any(Criteria),
      );
      expect(mockCommercialConnection.hasRole).toHaveBeenCalledWith(
        ConnectionRole.COMMERCIAL,
      );
      expect(mockVisitorConnection.hasRole).toHaveBeenCalledWith(
        ConnectionRole.COMMERCIAL,
      );
    });

    it('should throw error when no connections are found', async () => {
      // Arrange
      const query = new FindAllConnectionByCommercialQuery();
      connectionRepository.find.mockResolvedValue([]);

      // Act & Assert
      await expect(handler.execute()).rejects.toThrow('No commercial connections found');
      expect(connectionRepository.find).toHaveBeenCalledWith(expect.any(Criteria));
    });

    it('should return empty array when no commercial connections found but other connections exist', async () => {
      // Arrange
      const query = new FindAllConnectionByCommercialQuery();
      const nonCommercialConnections = [mockVisitorConnection];
      connectionRepository.find.mockResolvedValue(nonCommercialConnections);

      // Act
      const result = await handler.execute();

      // Assert
      expect(result).toEqual([]);
      expect(mockVisitorConnection.hasRole).toHaveBeenCalledWith(
        ConnectionRole.COMMERCIAL,
      );
    });

    it('should use correct criteria to find connected users', async () => {
      // Arrange
      const query = new FindAllConnectionByCommercialQuery();
      connectionRepository.find.mockResolvedValue([mockCommercialConnection]);

      // Act
      await handler.execute();

      // Assert
      const expectedCriteria = expect.objectContaining({
        filters: expect.arrayContaining([
          expect.objectContaining({
            field: 'isConnected',
            value: true,
          }),
        ]),
      });
      expect(connectionRepository.find).toHaveBeenCalledWith(expectedCriteria);
    });

    it('should handle repository errors gracefully', async () => {
      // Arrange
      const query = new FindAllConnectionByCommercialQuery();
      connectionRepository.find.mockRejectedValue(new Error('Database connection error'));

      // Act & Assert
      await expect(handler.execute()).rejects.toThrow('Database connection error');
      expect(connectionRepository.find).toHaveBeenCalledWith(expect.any(Criteria));
    });
  });
});