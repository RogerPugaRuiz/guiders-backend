import { Test, TestingModule } from '@nestjs/testing';
import { PaginatedCursorTrackingVisitorQueryHandler } from './paginated-cursor-tracking-visitor-query.handler';
import {
  ITrackingVisitorRepository,
  TRACKING_VISITOR_REPOSITORY,
} from '../../domain/tracking-visitor.repository';
import { PaginatedCursorTrackingVisitorQuery } from './paginated-cursor-tracking-visitor.query';
import { TrackingVisitor } from '../../domain/tracking-visitor';

// Mock del repositorio
const mockTrackingVisitorRepository: ITrackingVisitorRepository = {
  matcher: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  total: jest.fn(),
};

describe('PaginatedCursorTrackingVisitorQueryHandler', () => {
  let handler: PaginatedCursorTrackingVisitorQueryHandler;
  let repository: ITrackingVisitorRepository;

  // Crea un mock de TrackingVisitor
  const mockTrackingVisitor = (
    fields: Record<string, any>,
  ): TrackingVisitor => {
    return {
      toPrimitives: () => fields,
    } as unknown as TrackingVisitor;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaginatedCursorTrackingVisitorQueryHandler,
        {
          provide: TRACKING_VISITOR_REPOSITORY,
          useValue: mockTrackingVisitorRepository,
        },
      ],
    }).compile();

    handler = module.get(PaginatedCursorTrackingVisitorQueryHandler);
    repository = module.get(TRACKING_VISITOR_REPOSITORY);
    jest.clearAllMocks();
  });

  it('should return paginated items with hasMore true and nextCursor when items > limit', async () => {
    const query: PaginatedCursorTrackingVisitorQuery = {
      limit: 2,
      orderBy: [{ field: 'id', direction: 'ASC' }],
      cursor: null,
    };
    const items = [
      mockTrackingVisitor({ id: '1', name: 'A' }),
      mockTrackingVisitor({ id: '2', name: 'B' }),
      mockTrackingVisitor({ id: '3', name: 'C' }),
    ];
    (repository.matcher as jest.Mock).mockResolvedValue(items);
    (repository.total as jest.Mock).mockResolvedValue(3);

    const result = await handler.execute(query);

    expect(result.items).toEqual([
      { id: '1', name: 'A' },
      { id: '2', name: 'B' },
    ]);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).not.toBeNull();
    expect(result.total).toBe(3);
  });

  it('should return paginated items with hasMore false and nextCursor null when items <= limit', async () => {
    const query: PaginatedCursorTrackingVisitorQuery = {
      cursor: null,
      limit: 2,
      orderBy: [{ field: 'id', direction: 'ASC' }],
    };
    const items = [
      mockTrackingVisitor({ id: '1', name: 'A' }),
      mockTrackingVisitor({ id: '2', name: 'B' }),
    ];
    (repository.matcher as jest.Mock).mockResolvedValue(items);
    (repository.total as jest.Mock).mockResolvedValue(2);

    const result = await handler.execute(query);

    expect(result.items).toEqual([
      { id: '1', name: 'A' },
      { id: '2', name: 'B' },
    ]);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
    expect(result.total).toBe(2);
  });

  it('should handle empty items', async () => {
    const query: PaginatedCursorTrackingVisitorQuery = {
      cursor: null,
      limit: 2,
      orderBy: [{ field: 'id', direction: 'ASC' }],
    };
    (repository.matcher as jest.Mock).mockResolvedValue([]);
    (repository.total as jest.Mock).mockResolvedValue(0);

    const result = await handler.execute(query);

    expect(result.items).toEqual([]);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
    expect(result.total).toBe(0);
  });

  it('should call matcher with correct criteria', async () => {
    const query: PaginatedCursorTrackingVisitorQuery = {
      cursor: null,
      limit: 1,
      orderBy: [{ field: 'id', direction: 'ASC' }],
    };
    (repository.matcher as jest.Mock).mockResolvedValue([
      mockTrackingVisitor({ id: '1', name: 'A' }),
      mockTrackingVisitor({ id: '2', name: 'B' }),
    ]);
    await handler.execute(query);
    expect((repository.matcher as jest.Mock).mock.calls.length).toBeGreaterThan(
      0,
    );
  });

  it('should handle when no orderBy is provided', async () => {
    const query: PaginatedCursorTrackingVisitorQuery = {
      cursor: null,
      limit: 2,
      orderBy: [],
    };
    (repository.matcher as jest.Mock).mockResolvedValue([
      mockTrackingVisitor({ id: '1', name: 'A' }),
    ]);
    const result = await handler.execute(query);
    expect(result.items.length).toBe(1);
  });

  it('should handle when cursor is provided', async () => {
    // Simula un cursor base64 válido
    const base64Cursor = Buffer.from(JSON.stringify({ id: '1' })).toString(
      'base64',
    );
    const query: PaginatedCursorTrackingVisitorQuery = {
      cursor: base64Cursor,
      limit: 2,
      orderBy: [{ field: 'id', direction: 'ASC' }],
    };
    (repository.matcher as jest.Mock).mockResolvedValue([
      mockTrackingVisitor({ id: '2', name: 'B' }),
      mockTrackingVisitor({ id: '3', name: 'C' }),
    ]);
    const result = await handler.execute(query);
    expect(result.items.length).toBe(2);
  });
});
