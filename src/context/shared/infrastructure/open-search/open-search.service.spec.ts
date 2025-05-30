import { Test, TestingModule } from '@nestjs/testing';
import { OpenSearchService } from './open-search.service';
import { Client } from '@opensearch-project/opensearch';

// Mock de la clase Client de OpenSearch
jest.mock('@opensearch-project/opensearch', () => {
  return {
    Client: jest.fn().mockImplementation(() => ({
      cluster: {
        health: jest.fn().mockResolvedValue({
          body: {
            status: 'green',
          },
        }),
      },
      index: jest.fn().mockResolvedValue({
        body: {
          result: 'created',
        },
      }),
      search: jest.fn().mockResolvedValue({
        body: {
          hits: {
            hits: [
              {
                _id: 'test-id',
                _source: {
                  title: 'Test',
                  tags: ['test'],
                },
              },
            ],
          },
        },
      }),
    })),
  };
});

describe('OpenSearchService', () => {
  let service: OpenSearchService;
  let mockClient;

  beforeEach(async () => {
    // Limpiamos todos los mocks antes de cada test
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [OpenSearchService],
    }).compile();

    service = module.get<OpenSearchService>(OpenSearchService);
    mockClient = (Client as jest.Mock).mock.instances[0];
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should check cluster health on initialization', async () => {
      // Act
      await service.onModuleInit();

      // Assert
      expect(mockClient.cluster.health).toHaveBeenCalled();
    });

    it('should log an error if cluster health check fails', async () => {
      // Arrange
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const loggerErrorSpy = jest.spyOn(service['logger'], 'error').mockImplementation();
      
      mockClient.cluster.health.mockRejectedValueOnce(new Error('Connection refused'));

      // Act
      await service.onModuleInit();

      // Assert
      expect(mockClient.cluster.health).toHaveBeenCalled();
      expect(loggerErrorSpy).toHaveBeenCalledWith(expect.stringContaining('OpenSearch cluster is down'));
      
      // Restore console.error
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getClient', () => {
    it('should return the OpenSearch client instance', () => {
      // Act
      const result = service.getClient();

      // Assert
      expect(result).toBe(mockClient);
    });
  });
});