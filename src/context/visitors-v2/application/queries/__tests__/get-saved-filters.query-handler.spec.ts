import { Test, TestingModule } from '@nestjs/testing';
import { GetSavedFiltersQueryHandler } from '../get-saved-filters.query-handler';
import { GetSavedFiltersQuery } from '../get-saved-filters.query';
import {
  SavedFilterRepository,
  SAVED_FILTER_REPOSITORY,
} from '../../../domain/saved-filter.repository';
import { ok, err } from '../../../../shared/domain/result';
import { Uuid } from '../../../../shared/domain/value-objects/uuid';
import { SavedFilter } from '../../../domain/entities/saved-filter.aggregate';
import { SavedFilterPersistenceError } from '../../../domain/errors/saved-filter.error';

describe('GetSavedFiltersQueryHandler', () => {
  let handler: GetSavedFiltersQueryHandler;
  let savedFilterRepository: jest.Mocked<SavedFilterRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetSavedFiltersQueryHandler,
        {
          provide: SAVED_FILTER_REPOSITORY,
          useValue: {
            findByUserAndTenant: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<GetSavedFiltersQueryHandler>(
      GetSavedFiltersQueryHandler,
    );
    savedFilterRepository = module.get(SAVED_FILTER_REPOSITORY);
  });

  describe('execute', () => {
    const userId = Uuid.random().value;
    const tenantId = Uuid.random().value;

    const createMockFilter = (name: string) => {
      return SavedFilter.create({
        userId: new Uuid(userId),
        tenantId: new Uuid(tenantId),
        name,
        description: 'Test description',
        filters: { lifecycle: ['lead'] },
        sort: { field: 'createdAt', direction: 'DESC' },
      });
    };

    it('should return saved filters successfully', async () => {
      const filters = [
        createMockFilter('Filter 1'),
        createMockFilter('Filter 2'),
      ];
      savedFilterRepository.findByUserAndTenant.mockResolvedValue(ok(filters));

      const query = new GetSavedFiltersQuery(userId, tenantId);
      const result = await handler.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.filters).toHaveLength(2);
      expect(response.total).toBe(2);
    });

    it('should return empty list when no filters exist', async () => {
      savedFilterRepository.findByUserAndTenant.mockResolvedValue(ok([]));

      const query = new GetSavedFiltersQuery(userId, tenantId);
      const result = await handler.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.filters).toHaveLength(0);
      expect(response.total).toBe(0);
    });

    it('should return error when repository fails', async () => {
      savedFilterRepository.findByUserAndTenant.mockResolvedValue(
        err(new SavedFilterPersistenceError('Error de conexión')),
      );

      const query = new GetSavedFiltersQuery(userId, tenantId);
      const result = await handler.execute(query);

      expect(result.isErr()).toBe(true);
    });

    it('should map filters to response DTOs correctly', async () => {
      const filter = createMockFilter('Test Filter');
      savedFilterRepository.findByUserAndTenant.mockResolvedValue(ok([filter]));

      const query = new GetSavedFiltersQuery(userId, tenantId);
      const result = await handler.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.filters[0]).toMatchObject({
        name: 'Test Filter',
        userId,
        tenantId,
      });
    });
  });
});
