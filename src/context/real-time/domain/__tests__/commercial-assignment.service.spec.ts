import { Test, TestingModule } from '@nestjs/testing';
import { CommercialAssignmentService } from '../commercial-assignment.service';
import { CONNECTION_REPOSITORY } from '../connection.repository';
import { ConnectionUser } from '../connection-user';

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
  });
});

// Helper seguro para crear ConnectionUser usando fromPrimitives (método público y seguro)
function createMockConnectionUser(
  userId: string,
  isConnected: boolean,
): ConnectionUser {
  return ConnectionUser.fromPrimitives({
    userId,
    socketId: isConnected ? 'socket-' + userId : undefined,
    roles: ['commercial'],
  });
}
