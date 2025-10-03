import { Test, TestingModule } from '@nestjs/testing';
import { GetVisitorsByTenantQueryHandler } from '../get-visitors-by-tenant.query-handler';
import { GetVisitorsByTenantQuery } from '../get-visitors-by-tenant.query';
import {
  VISITOR_V2_REPOSITORY,
  VisitorV2Repository,
  PaginatedVisitorsResult,
} from '../../../domain/visitor-v2.repository';
import {
  COMPANY_REPOSITORY,
  CompanyRepository,
} from '../../../../company/domain/company.repository';
import {
  CHAT_V2_REPOSITORY,
  IChatRepository,
} from '../../../../conversations-v2/domain/chat.repository';
import { VisitorV2 } from '../../../domain/visitor-v2.aggregate';
import { TenantId } from '../../../domain/value-objects/tenant-id';
import { ok } from '../../../../shared/domain/result';
import { Uuid } from '../../../../shared/domain/value-objects/uuid';
import { VisitorLifecycle } from '../../../domain/value-objects/visitor-lifecycle';

describe('GetVisitorsByTenantQueryHandler', () => {
  let handler: GetVisitorsByTenantQueryHandler;
  let mockVisitorRepository: jest.Mocked<VisitorV2Repository>;
  let mockCompanyRepository: jest.Mocked<CompanyRepository>;
  let mockChatRepository: jest.Mocked<IChatRepository>;

  const tenantId = Uuid.random().value;
  const siteId = Uuid.random().value;

  beforeEach(async () => {
    // Mock del repositorio de visitantes
    mockVisitorRepository = {
      findByTenantIdWithDetails: jest.fn(),
    } as any;

    // Mock del repositorio de company
    mockCompanyRepository = {
      findById: jest.fn(),
    } as any;

    // Mock del repositorio de chats
    mockChatRepository = {
      getPendingQueue: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetVisitorsByTenantQueryHandler,
        {
          provide: VISITOR_V2_REPOSITORY,
          useValue: mockVisitorRepository,
        },
        {
          provide: COMPANY_REPOSITORY,
          useValue: mockCompanyRepository,
        },
        {
          provide: CHAT_V2_REPOSITORY,
          useValue: mockChatRepository,
        },
      ],
    }).compile();

    handler = module.get<GetVisitorsByTenantQueryHandler>(
      GetVisitorsByTenantQueryHandler,
    );
  });

  describe('totalCount con paginación', () => {
    it('debe devolver el totalCount real cuando hay más registros que el límite de paginación', async () => {
      // Arrange: Simular que hay 100 visitantes en total, pero solo pedimos 10
      const totalRealCount = 100;
      const pageSize = 10;
      const offset = 0;

      // Crear 10 visitantes mock (solo los de la primera página)
      const mockVisitors: VisitorV2[] = Array.from(
        { length: pageSize },
        (_, i) =>
          VisitorV2.fromPrimitives({
            id: Uuid.random().value,
            fingerprint: `fp_visitor_${i}`,
            tenantId,
            siteId,
            lifecycle: VisitorLifecycle.ANON,
            sessions: [
              {
                id: Uuid.random().value,
                startedAt: new Date().toISOString(),
                lastActivityAt: new Date().toISOString(),
              },
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
      );

      const paginatedResult: PaginatedVisitorsResult = {
        visitors: mockVisitors,
        totalCount: totalRealCount, // ✅ El count real, no el de la página
      };

      mockVisitorRepository.findByTenantIdWithDetails.mockResolvedValue(
        ok(paginatedResult),
      );

      // Mock company repository
      mockCompanyRepository.findById.mockResolvedValue(
        ok({
          toPrimitives: () => ({
            companyName: 'Test Company',
          }),
          getSites: () => ({
            toPrimitives: () => [
              {
                id: siteId,
                name: 'Test Site',
                canonicalDomain: 'test.com',
              },
            ],
          }),
        } as any),
      );

      // Mock chat repository (sin chats pendientes)
      mockChatRepository.getPendingQueue.mockResolvedValue(ok([]));

      // Act
      const query = GetVisitorsByTenantQuery.create({
        tenantId,
        includeOffline: true,
        limit: pageSize,
        offset,
      });

      const result = await handler.execute(query);

      // Assert
      expect(result.totalCount).toBe(totalRealCount); // ✅ Debe ser 100, NO 10
      expect(result.visitors.length).toBe(pageSize); // ✅ Pero solo 10 visitantes en la página
      expect(mockVisitorRepository.findByTenantIdWithDetails).toHaveBeenCalledWith(
        expect.any(TenantId),
        {
          includeOffline: true,
          limit: pageSize,
          offset,
        },
      );
    });

    it('debe devolver el totalCount correcto en la segunda página', async () => {
      // Arrange: Segunda página de resultados
      const totalRealCount = 100;
      const pageSize = 10;
      const offset = 10; // Segunda página

      // Crear 10 visitantes mock (segunda página)
      const mockVisitors: VisitorV2[] = Array.from(
        { length: pageSize },
        (_, i) =>
          VisitorV2.fromPrimitives({
            id: Uuid.random().value,
            fingerprint: `fp_visitor_${i + offset}`,
            tenantId,
            siteId,
            lifecycle: VisitorLifecycle.ANON,
            sessions: [
              {
                id: Uuid.random().value,
                startedAt: new Date().toISOString(),
                lastActivityAt: new Date().toISOString(),
              },
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
      );

      const paginatedResult: PaginatedVisitorsResult = {
        visitors: mockVisitors,
        totalCount: totalRealCount,
      };

      mockVisitorRepository.findByTenantIdWithDetails.mockResolvedValue(
        ok(paginatedResult),
      );

      mockCompanyRepository.findById.mockResolvedValue(
        ok({
          toPrimitives: () => ({
            companyName: 'Test Company',
          }),
          getSites: () => ({
            toPrimitives: () => [
              {
                id: siteId,
                name: 'Test Site',
                canonicalDomain: 'test.com',
              },
            ],
          }),
        } as any),
      );

      mockChatRepository.getPendingQueue.mockResolvedValue(ok([]));

      // Act
      const query = GetVisitorsByTenantQuery.create({
        tenantId,
        includeOffline: true,
        limit: pageSize,
        offset,
      });

      const result = await handler.execute(query);

      // Assert
      expect(result.totalCount).toBe(totalRealCount); // ✅ Sigue siendo 100 en la segunda página
      expect(result.visitors.length).toBe(pageSize); // ✅ 10 visitantes de la segunda página
    });

    it('debe devolver totalCount igual al tamaño de la página cuando hay menos registros que el límite', async () => {
      // Arrange: Solo 5 visitantes en total
      const totalRealCount = 5;
      const pageSize = 10;

      const mockVisitors: VisitorV2[] = Array.from(
        { length: totalRealCount },
        (_, i) =>
          VisitorV2.fromPrimitives({
            id: Uuid.random().value,
            fingerprint: `fp_visitor_${i}`,
            tenantId,
            siteId,
            lifecycle: VisitorLifecycle.ANON,
            sessions: [
              {
                id: Uuid.random().value,
                startedAt: new Date().toISOString(),
                lastActivityAt: new Date().toISOString(),
              },
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
      );

      const paginatedResult: PaginatedVisitorsResult = {
        visitors: mockVisitors,
        totalCount: totalRealCount,
      };

      mockVisitorRepository.findByTenantIdWithDetails.mockResolvedValue(
        ok(paginatedResult),
      );

      mockCompanyRepository.findById.mockResolvedValue(
        ok({
          toPrimitives: () => ({
            companyName: 'Test Company',
          }),
          getSites: () => ({
            toPrimitives: () => [
              {
                id: siteId,
                name: 'Test Site',
                canonicalDomain: 'test.com',
              },
            ],
          }),
        } as any),
      );

      mockChatRepository.getPendingQueue.mockResolvedValue(ok([]));

      // Act
      const query = GetVisitorsByTenantQuery.create({
        tenantId,
        includeOffline: true,
        limit: pageSize,
        offset: 0,
      });

      const result = await handler.execute(query);

      // Assert
      expect(result.totalCount).toBe(totalRealCount); // ✅ 5 total
      expect(result.visitors.length).toBe(totalRealCount); // ✅ 5 en la página
    });

    it('debe devolver totalCount 0 cuando no hay visitantes', async () => {
      // Arrange: Sin visitantes
      const paginatedResult: PaginatedVisitorsResult = {
        visitors: [],
        totalCount: 0,
      };

      mockVisitorRepository.findByTenantIdWithDetails.mockResolvedValue(
        ok(paginatedResult),
      );

      mockCompanyRepository.findById.mockResolvedValue(
        ok({
          toPrimitives: () => ({
            companyName: 'Test Company',
          }),
          getSites: () => ({
            toPrimitives: () => [],
          }),
        } as any),
      );

      mockChatRepository.getPendingQueue.mockResolvedValue(ok([]));

      // Act
      const query = GetVisitorsByTenantQuery.create({
        tenantId,
        includeOffline: true,
        limit: 50,
        offset: 0,
      });

      const result = await handler.execute(query);

      // Assert
      expect(result.totalCount).toBe(0);
      expect(result.visitors.length).toBe(0);
    });
  });
});
