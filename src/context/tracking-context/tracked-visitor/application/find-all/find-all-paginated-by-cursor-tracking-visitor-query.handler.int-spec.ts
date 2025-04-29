import * as dotenv from 'dotenv';
dotenv.config();
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FindAllPaginatedByCursorTrackingVisitorQueryHandler } from './find-all-paginated-by-cursor-tracking-visitor-query.handler';
import { FindAllPaginatedByCursorTrackingVisitorQuery } from './find-all-paginated-by-cursor-tracking-visitor.query';
import { TrackingVisitorEntity } from '../../infrastructure/tracking-visitor.entity';
import { TrackingVisitorService } from '../../infrastructure/tracking-visitor.service';
import { TrackingVisitorPaginationResponseDto } from './tracking-visitor-pagination-response.dto';
import { UUID } from 'src/context/shared/domain/value-objects/uuid';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { INestApplication } from '@nestjs/common';
import { TRACKING_VISITOR_REPOSITORY } from '../../domain/tracking-visitor.repository';

// Integration database config using test environment variables
const dbConfig = {
  type: 'postgres' as const, // Tipado estricto requerido por TypeORM
  host: process.env.TEST_DATABASE_HOST,
  port: parseInt(process.env.TEST_DATABASE_PORT || '5432', 10),
  username: process.env.TEST_DATABASE_USERNAME,
  password: process.env.TEST_DATABASE_PASSWORD,
  database: process.env.TEST_DATABASE,
  entities: [TrackingVisitorEntity],
  synchronize: true,
};

describe('FindAllPaginatedByCursorTrackingVisitorQueryHandler (integration)', () => {
  let app: INestApplication;
  let handler: FindAllPaginatedByCursorTrackingVisitorQueryHandler;
  let repository: Repository<TrackingVisitorEntity>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(dbConfig),
        TypeOrmModule.forFeature([TrackingVisitorEntity]),
      ],
      providers: [
        TrackingVisitorService,
        {
          provide: TRACKING_VISITOR_REPOSITORY,
          useExisting: TrackingVisitorService,
        },
        FindAllPaginatedByCursorTrackingVisitorQueryHandler,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    handler = moduleFixture.get(
      FindAllPaginatedByCursorTrackingVisitorQueryHandler,
    );
    repository = moduleFixture.get<Repository<TrackingVisitorEntity>>(
      getRepositoryToken(TrackingVisitorEntity),
    );
  });

  beforeEach(async () => {
    // Limpia la tabla antes de cada test
    await repository.query('DELETE FROM tracking_visitor');
  });

  afterAll(async () => {
    await app.close();
  });

  it('should paginate visitors with multiple order and cursors', async () => {
    // Inserta datos de prueba
    const now = new Date();
    const visitors: TrackingVisitorEntity[] = [
      {
        id: UUID.random().value,
        visitorName: 'Alice',
        lastVisitedUrl: 'http://localhost/1',
        lastVisitedAt: now,
        isConnected: true,
        pageViews: 5,
        sessionDurationSeconds: 100,
        ultimateConnectionDate: now,
        createdAt: new Date(now.getTime() - 3000),
        updatedAt: now,
      },
      {
        id: UUID.random().value,
        visitorName: 'Bob',
        lastVisitedUrl: 'http://localhost/2',
        lastVisitedAt: now,
        isConnected: false,
        pageViews: 10,
        sessionDurationSeconds: 200,
        ultimateConnectionDate: now,
        createdAt: new Date(now.getTime() - 2000),
        updatedAt: now,
      },
      {
        id: UUID.random().value,
        visitorName: 'Charlie',
        lastVisitedUrl: 'http://localhost/3',
        lastVisitedAt: now,
        isConnected: true,
        pageViews: 15,
        sessionDurationSeconds: 300,
        ultimateConnectionDate: now,
        createdAt: new Date(now.getTime() - 1000),
        updatedAt: now,
      },
    ];

    await repository.save([...visitors]);

    // Primera página, ordena por createdAt DESC, id DESC, limit 2
    const query = new FindAllPaginatedByCursorTrackingVisitorQuery({
      limit: 2,
      orderBy: [
        { field: 'createdAt', direction: 'DESC' },
        { field: 'id', direction: 'DESC' },
      ],
      cursor: null, // Cambiado de 'cursors' a 'cursor'
    });
    const result: TrackingVisitorPaginationResponseDto =
      await handler.execute(query);
    expect(result.items.length).toBe(2);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBeDefined();
    expect(typeof result.nextCursor).toBe('string'); // Validar que nextCursor es un string

    console.log(JSON.stringify(visitors));
    // Segunda página usando el nextCursor
    const nextQuery = new FindAllPaginatedByCursorTrackingVisitorQuery({
      limit: 2,
      orderBy: [
        { field: 'createdAt', direction: 'DESC' },
        { field: 'id', direction: 'DESC' },
      ],
      cursor: result.nextCursor, // Cambiado de 'cursors' a 'cursor'
    });
    const nextResult: TrackingVisitorPaginationResponseDto =
      await handler.execute(nextQuery);
    expect(nextResult.items.length).toBe(1);
    expect(nextResult.hasMore).toBe(false);
    expect(nextResult.nextCursor).toBeNull();
  });
});
