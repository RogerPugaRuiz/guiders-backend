import { Test, TestingModule } from '@nestjs/testing';
import { CommercialAssignmentService } from '../commercial-assignment.service';
import { CONNECTION_REPOSITORY } from '../connection.repository';
import { ConnectionUser } from '../connection-user';
import { RepositoryError } from '../../../shared/domain/errors/repository.error';

describe('CommercialAssignmentService', () => {
  let service: CommercialAssignmentService;
  let mockConnectionRepository: { find: jest.Mock };

  beforeEach(async () => {
    mockConnectionRepository = { find: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommercialAssignmentService,
        { provide: CONNECTION_REPOSITORY, useValue: mockConnectionRepository },
      ],
    }).compile();
    service = module.get<CommercialAssignmentService>(
      CommercialAssignmentService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getConnectedCommercials', () => {
    it('should return empty array when no commercials are found', async () => {
      mockConnectionRepository.find.mockResolvedValue([]);
      const result = await service.getConnectedCommercials();
      expect(result).toEqual([]);
      expect(mockConnectionRepository.find).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when null is returned from repository', async () => {
      mockConnectionRepository.find.mockResolvedValue(null);
      const result = await service.getConnectedCommercials();
      expect(result).toEqual([]);
      expect(mockConnectionRepository.find).toHaveBeenCalledTimes(1);
    });

    it('should return only connected commercials', async () => {
      const connectedCommercial = createMockConnectionUser('user1', true);
      const disconnectedCommercial = createMockConnectionUser('user2', false);
      mockConnectionRepository.find.mockResolvedValue([
        connectedCommercial,
        disconnectedCommercial,
      ]);
      const result = await service.getConnectedCommercials();
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(connectedCommercial);
      expect(mockConnectionRepository.find).toHaveBeenCalledTimes(1);
    });

    it('should filter by companyId when provided', async () => {
      const testCompanyId = '123e4567-e89b-12d3-a456-426614174000';
      const connectedCommercial = createMockConnectionUser(
        'user1',
        true,
        testCompanyId,
      );
      mockConnectionRepository.find.mockResolvedValue([connectedCommercial]);

      const result = await service.getConnectedCommercials(testCompanyId);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(connectedCommercial);
      expect(mockConnectionRepository.find).toHaveBeenCalledTimes(1);

      // Verificar que se pasó el criteria con filtro por companyId
      const calledCriteria = mockConnectionRepository.find.mock.calls[0][0];
      expect(calledCriteria.filters).toHaveLength(2); // roles + companyId

      const companyIdFilter = calledCriteria.filters.find(
        (filter: any) => filter.field === 'companyId',
      );
      expect(companyIdFilter).toBeDefined();
      expect(companyIdFilter.operator).toBe('=');
      expect(companyIdFilter.value).toBe(testCompanyId);
    });

    it('should not filter by companyId when not provided', async () => {
      const connectedCommercial = createMockConnectionUser('user1', true);
      mockConnectionRepository.find.mockResolvedValue([connectedCommercial]);

      const result = await service.getConnectedCommercials();

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(connectedCommercial);
      expect(mockConnectionRepository.find).toHaveBeenCalledTimes(1);

      // Verificar que solo se pasó el filtro por roles
      const calledCriteria = mockConnectionRepository.find.mock.calls[0][0];
      expect(calledCriteria.filters).toHaveLength(1); // solo roles

      const companyIdFilter = calledCriteria.filters.find(
        (filter: any) => filter.field === 'companyId',
      );
      expect(companyIdFilter).toBeUndefined();
    });

    it('should throw RepositoryError when repository fails', async () => {
      mockConnectionRepository.find.mockRejectedValue(
        new Error('Database connection failed'),
      );
      await expect(service.getConnectedCommercials()).rejects.toThrow(
        RepositoryError,
      );
      await expect(service.getConnectedCommercials()).rejects.toThrow(
        'Failed to retrieve connected commercials',
      );
      expect(mockConnectionRepository.find).toHaveBeenCalledTimes(2);
    });
  });
});

// Helper seguro para crear ConnectionUser usando fromPrimitives (método público y seguro)
function createMockConnectionUser(
  userId: string,
  isConnected: boolean,
  companyId?: string,
): ConnectionUser {
  return ConnectionUser.fromPrimitives({
    userId,
    socketId: isConnected ? 'socket-' + userId : undefined,
    roles: ['commercial'],
    companyId,
  });
}
