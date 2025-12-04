import { Test, TestingModule } from '@nestjs/testing';
import { SearchVisitorsQueryHandler } from '../search-visitors.query-handler';
import { SearchVisitorsQuery } from '../search-visitors.query';
import {
  VisitorV2Repository,
  VISITOR_V2_REPOSITORY,
} from '../../../domain/visitor-v2.repository';
import {
  IChatRepository,
  CHAT_V2_REPOSITORY,
} from '../../../../conversations-v2/domain/chat.repository';
import { ok, err } from '../../../../shared/domain/result';
import { Uuid } from '../../../../shared/domain/value-objects/uuid';
import { VisitorV2PersistenceError } from '../../../domain/errors/visitor-v2.error';
import {
  VisitorSortField,
  SortDirection,
} from '../../dtos/visitor-filters.dto';

describe('SearchVisitorsQueryHandler', () => {
  let handler: SearchVisitorsQueryHandler;
  let visitorRepository: jest.Mocked<VisitorV2Repository>;
  let chatRepository: jest.Mocked<IChatRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchVisitorsQueryHandler,
        {
          provide: VISITOR_V2_REPOSITORY,
          useValue: {
            searchWithFilters: jest.fn(),
          },
        },
        {
          provide: CHAT_V2_REPOSITORY,
          useValue: {
            countByVisitorIds: jest.fn().mockResolvedValue(ok(new Map())),
          },
        },
      ],
    }).compile();

    handler = module.get<SearchVisitorsQueryHandler>(
      SearchVisitorsQueryHandler,
    );
    visitorRepository = module.get(VISITOR_V2_REPOSITORY);
    chatRepository = module.get(CHAT_V2_REPOSITORY);
  });

  describe('execute', () => {
    const tenantId = Uuid.random().value;
    const siteId = Uuid.random().value;

    const createMockVisitor = () => {
      const id = Uuid.random().value;
      return {
        getId: () => ({ getValue: () => id }),
        toPrimitives: () => ({
          id,
          tenantId,
          siteId,
          fingerprint: `fp_${id}`,
          lifecycle: 'visitor',
          connectionStatus: 'online',
          hasAcceptedPrivacyPolicy: true,
          currentUrl: 'https://example.com',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sessions: [],
        }),
      };
    };

    const createQuery = (filters = {}, sort = {}, pagination = {}) => {
      return new SearchVisitorsQuery(
        tenantId,
        filters,
        {
          field: VisitorSortField.LAST_ACTIVITY,
          direction: SortDirection.DESC,
          ...sort,
        },
        { page: 1, limit: 20, ...pagination },
      );
    };

    it('should return visitors with pagination info', async () => {
      const visitors = [createMockVisitor(), createMockVisitor()];
      visitorRepository.searchWithFilters.mockResolvedValue(
        ok({
          visitors: visitors as any,
          total: 2,
          page: 1,
          limit: 20,
          totalPages: 1,
        }),
      );

      const query = createQuery();
      const result = await handler.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.visitors).toHaveLength(2);
      expect(response.pagination.total).toBe(2);
      expect(response.pagination.totalPages).toBe(1);
    });

    it('should apply lifecycle filter', async () => {
      visitorRepository.searchWithFilters.mockResolvedValue(
        ok({
          visitors: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
        }),
      );

      const query = createQuery({ lifecycle: ['lead', 'visitor'] });
      await handler.execute(query);

      expect(visitorRepository.searchWithFilters).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ lifecycle: ['lead', 'visitor'] }),
        expect.anything(),
        expect.anything(),
      );
    });

    it('should return error when repository fails', async () => {
      visitorRepository.searchWithFilters.mockResolvedValue(
        err(new VisitorV2PersistenceError('Error de conexión')),
      );

      const query = createQuery();
      const result = await handler.execute(query);

      expect(result.isErr()).toBe(true);
    });

    it('should calculate pagination correctly', async () => {
      visitorRepository.searchWithFilters.mockResolvedValue(
        ok({
          visitors: [],
          total: 100,
          page: 2,
          limit: 20,
          totalPages: 5,
        }),
      );

      const query = createQuery({}, {}, { page: 2, limit: 20 });
      const result = await handler.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.pagination.hasNextPage).toBe(true);
      expect(response.pagination.hasPreviousPage).toBe(true);
    });

    it('should map sort fields correctly', async () => {
      visitorRepository.searchWithFilters.mockResolvedValue(
        ok({
          visitors: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
        }),
      );

      const query = createQuery(
        {},
        { field: VisitorSortField.CREATED_AT, direction: SortDirection.ASC },
      );
      await handler.execute(query);

      expect(visitorRepository.searchWithFilters).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          field: 'createdAt',
          direction: 'ASC',
        }),
        expect.anything(),
      );
    });
  });
});
