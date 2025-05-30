import { ConnectUseCase } from '../connect.usecase';
import { Optional } from 'src/context/shared/domain/optional';
import { ConnectionUser } from '../../../domain/connection-user';
import { ConnectionUserId } from '../../../domain/value-objects/connection-user-id';
import { ConnectionSocketId } from '../../../domain/value-objects/connection-socket-id';
import { ConnectionRole } from '../../../domain/value-objects/connection-role';
import { Criteria } from 'src/context/shared/domain/criteria';

describe('ConnectUseCase', () => {
  let connectUseCase: ConnectUseCase;
  let mockConnectionRepository: any;
  let mockEventPublisher: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Crear mocks
    mockConnectionRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockEventPublisher = {
      mergeObjectContext: jest.fn().mockReturnValue({
        commit: jest.fn(),
      }),
    };

    // Crear instancia del caso de uso con los mocks
    connectUseCase = new ConnectUseCase(mockConnectionRepository, mockEventPublisher);

    // Reemplazar el logger interno
    (connectUseCase as any).logger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
  });

  describe('execute', () => {
    it('debe crear una nueva conexión cuando no existe el usuario', async () => {
      // Arrange
      const connectionId = 'user-123';
      const roles = ['visitor'];
      const socketId = 'socket-123';

      // Mock findOne para devolver que no existe la conexión
      mockConnectionRepository.findOne.mockResolvedValue(Optional.empty());

      // Mock para ConnectionUser.create
      const mockNewConnection = {
        connect: jest.fn(),
        commit: jest.fn(),
      };
      mockNewConnection.connect.mockReturnValue(mockNewConnection);
      jest.spyOn(ConnectionUser, 'create').mockReturnValue(mockNewConnection as any);

      // Act
      await connectUseCase.execute({ connectionId, roles, socketId });

      // Assert
      expect(mockConnectionRepository.findOne).toHaveBeenCalled();
      expect(ConnectionUser.create).toHaveBeenCalledWith({
        userId: expect.any(ConnectionUserId),
        roles: expect.arrayContaining([expect.any(ConnectionRole)]),
      });
      expect(mockNewConnection.connect).toHaveBeenCalledWith(
        expect.any(ConnectionSocketId)
      );
      expect(mockConnectionRepository.save).toHaveBeenCalledWith(mockNewConnection);
    });

    it('debe actualizar una conexión existente cuando el usuario existe sin socketId', async () => {
      // Arrange
      const connectionId = 'user-123';
      const roles = ['visitor'];
      const socketId = 'socket-123';

      // Mock para una conexión existente sin socketId
      const mockExistingConnection = {
        socketId: Optional.empty(),
        connect: jest.fn(),
      };
      mockExistingConnection.connect.mockReturnValue(mockExistingConnection);

      // Mock findOne para devolver una conexión existente
      mockConnectionRepository.findOne.mockResolvedValue(Optional.of(mockExistingConnection));

      // Act
      await connectUseCase.execute({ connectionId, roles, socketId });

      // Assert
      expect(mockConnectionRepository.findOne).toHaveBeenCalled();
      expect(mockExistingConnection.connect).toHaveBeenCalled();
      expect(mockConnectionRepository.save).toHaveBeenCalledWith(mockExistingConnection);
    });

    it('no debe actualizar cuando la conexión ya existe con socketId', async () => {
      // Arrange
      const connectionId = 'user-123';
      const roles = ['visitor'];
      const socketId = 'socket-123';

      // Mock para una conexión existente con socketId
      const mockExistingSocketId = {
        value: 'existing-socket-id',
      };
      const mockExistingConnection = {
        socketId: Optional.of(mockExistingSocketId),
      };

      // Mock findOne para devolver una conexión existente con socketId
      mockConnectionRepository.findOne.mockResolvedValue(Optional.of(mockExistingConnection));

      // Act
      await connectUseCase.execute({ connectionId, roles, socketId });

      // Assert
      expect(mockConnectionRepository.findOne).toHaveBeenCalled();
      expect(mockConnectionRepository.save).not.toHaveBeenCalled();
    });
  });
});