import { Test, TestingModule } from '@nestjs/testing';
import { OpenSearchService } from './open-search.service';
import { Client } from '@opensearch-project/opensearch';

// Crear un mock manual para el cliente OpenSearch
const mockClusterHealth = jest.fn().mockResolvedValue({
  body: { status: 'green' },
});

const mockClient = {
  cluster: {
    health: mockClusterHealth,
  },
  index: jest.fn().mockResolvedValue({
    body: { result: 'created' },
  }),
  search: jest.fn().mockResolvedValue({
    body: {
      hits: {
        hits: [{ _id: 'test-id', _source: { title: 'Test', tags: ['test'] } }],
      },
    },
  }),
};

// Mock del constructor de Client
jest.mock('@opensearch-project/opensearch', () => ({
  Client: jest.fn().mockImplementation(() => mockClient),
}));

describe('OpenSearchService', () => {
  let service: OpenSearchService;

  beforeEach(async () => {
    // Limpiamos todos los mocks antes de cada test
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [OpenSearchService],
    }).compile();

    service = module.get<OpenSearchService>(OpenSearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should check cluster health on initialization', async () => {
      // Act
      await service.onModuleInit();

      // Assert
      expect(mockClusterHealth).toHaveBeenCalled();
    });

    it('should log an error if cluster health check fails', async () => {
      // Arrange
      const loggerErrorSpy = jest.spyOn(service['logger'], 'error').mockImplementation();
      
      // Forzar que el método health falle para esta prueba
      mockClusterHealth.mockRejectedValueOnce(new Error('Connection refused'));

      // Act
      await service.onModuleInit();

      // Assert
      expect(mockClusterHealth).toHaveBeenCalled();
      expect(loggerErrorSpy).toHaveBeenCalledWith(expect.stringContaining('OpenSearch cluster is down'));
    });
  });

  describe('getClient', () => {
    it('should return the OpenSearch client instance', () => {
      // Act
      const result = service.getClient();

      // Assert
      expect(result).toEqual(mockClient);
    });
  });
});