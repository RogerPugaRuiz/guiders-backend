import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { CqrsModule } from '@nestjs/cqrs';
import * as cookieParser from 'cookie-parser';
import { VisitorV2Controller } from '../src/context/visitors-v2/infrastructure/controllers/visitor-v2.controller';
import { IdentifyVisitorCommandHandler } from '../src/context/visitors-v2/application/commands/identify-visitor.command-handler';
import { UpdateSessionHeartbeatCommandHandler } from '../src/context/visitors-v2/application/commands/update-session-heartbeat.command-handler';
import { EndSessionCommandHandler } from '../src/context/visitors-v2/application/commands/end-session.command-handler';
import { ResolveSiteCommandHandler } from '../src/context/visitors-v2/application/commands/resolve-site.command-handler';
import {
  VisitorV2Repository,
  VISITOR_V2_REPOSITORY,
} from '../src/context/visitors-v2/domain/visitor-v2.repository';
import {
  CompanyRepository,
  COMPANY_REPOSITORY,
} from '../src/context/company/domain/company.repository';
import {
  VALIDATE_DOMAIN_API_KEY,
  ValidateDomainApiKey,
} from '../src/context/auth/auth-visitor/application/services/validate-domain-api-key';
import { EventPublisher } from '@nestjs/cqrs';
import { ok, err, okVoid } from '../src/context/shared/domain/result';
import { VisitorV2PersistenceError } from '../src/context/visitors-v2/infrastructure/persistence/impl/visitor-v2-mongo.repository.impl';
import { VisitorV2 } from '../src/context/visitors-v2/domain/visitor-v2.aggregate';
import { VisitorId } from '../src/context/visitors-v2/domain/value-objects/visitor-id';
import { SessionId } from '../src/context/visitors-v2/domain/value-objects/session-id';
import { TenantId } from '../src/context/visitors-v2/domain/value-objects/tenant-id';
import { SiteId } from '../src/context/visitors-v2/domain/value-objects/site-id';
import { VisitorFingerprint } from '../src/context/visitors-v2/domain/value-objects/visitor-fingerprint';
import {
  VisitorLifecycleVO,
  VisitorLifecycle,
} from '../src/context/visitors-v2/domain/value-objects/visitor-lifecycle';
import { Company } from '../src/context/company/domain/company.aggregate';
import { CompanyName } from '../src/context/company/domain/value-objects/company-name';
import { CompanySites } from '../src/context/company/domain/value-objects/company-sites';
import { Site } from '../src/context/company/domain/entities/site';
import { SiteName } from '../src/context/company/domain/value-objects/site-name';
import { CanonicalDomain } from '../src/context/company/domain/value-objects/canonical-domain';
import { DomainAliases } from '../src/context/company/domain/value-objects/domain-aliases';
import { Uuid } from '../src/context/shared/domain/value-objects/uuid';

// Este test valida que el backend acepta heartbeats y endSession usando únicamente la cookie HttpOnly
// sin enviar sessionId explícito en el body.

describe('Visitor Session Cookie Fallback E2E', () => {
  let app: INestApplication;
  let mockVisitorRepository: jest.Mocked<VisitorV2Repository>;
  let mockCompanyRepository: jest.Mocked<CompanyRepository>;
  let mockValidateDomainApiKey: jest.Mocked<ValidateDomainApiKey>;
  let mockEventPublisher: jest.Mocked<EventPublisher>;

  const mockVisitorId = '01234567-8901-4234-9567-890123456789';
  const mockTenantId = '23456789-0123-4567-8901-234567890123';
  const mockSiteId = '34567890-1234-4567-8901-234567890123';

  const createMockCompany = () => {
    const companyId = new Uuid(mockTenantId);
    const siteId = new SiteId(mockSiteId);
    const site = Site.create({
      id: siteId,
      name: new SiteName('Landing Site'),
      canonicalDomain: new CanonicalDomain('landing.mytech.com'),
      domainAliases: DomainAliases.fromPrimitives([
        'landing.mytech.com',
        'www.landing.mytech.com',
      ]),
    });

    return Company.create({
      id: companyId,
      companyName: new CompanyName('MyTech Company'),
      sites: CompanySites.fromSiteArray([site]),
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    });
  };

  beforeEach(async () => {
    mockVisitorRepository = {
      findByFingerprintAndSite: jest.fn(),
      findBySessionId: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      findBySiteId: jest.fn(),
      findByTenantId: jest.fn(),
      update: jest.fn(),
      findWithActiveSessions: jest.fn(),
      findBySiteIdWithDetails: jest.fn(),
      findWithUnassignedChatsBySiteId: jest.fn(),
      findWithQueuedChatsBySiteId: jest.fn(),
      findByTenantIdWithDetails: jest.fn(),
      findWithUnassignedChatsByTenantId: jest.fn(),
      findWithQueuedChatsByTenantId: jest.fn(),
    };

    mockCompanyRepository = {
      findByDomain: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
    };

    mockValidateDomainApiKey = { validate: jest.fn() } as any;
    mockEventPublisher = { mergeObjectContext: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      controllers: [VisitorV2Controller],
      providers: [
        IdentifyVisitorCommandHandler,
        UpdateSessionHeartbeatCommandHandler,
        EndSessionCommandHandler,
        ResolveSiteCommandHandler,
        { provide: VISITOR_V2_REPOSITORY, useValue: mockVisitorRepository },
        { provide: COMPANY_REPOSITORY, useValue: mockCompanyRepository },
        {
          provide: VALIDATE_DOMAIN_API_KEY,
          useValue: mockValidateDomainApiKey,
        },
        { provide: EventPublisher, useValue: mockEventPublisher },
      ],
    }).compile();

    app = module.createNestApplication();
    // Habilitar cookie-parser para que el controller pueda leer la cookie 'sid'
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    mockValidateDomainApiKey.validate.mockResolvedValue(true);

    const mockCompany = createMockCompany();
    mockCompanyRepository.findByDomain.mockResolvedValue(ok(mockCompany));
  });

  afterEach(async () => {
    await app.close();
  });

  it('debe permitir heartbeat y endSession usando solo cookie sid', async () => {
    // 1. identify crea visitante nuevo
    mockVisitorRepository.findByFingerprintAndSite.mockResolvedValue(
      err(new VisitorV2PersistenceError('Visitante no encontrado')),
    );

    const mockContextIdentify = {
      commit: jest.fn(),
      getId: jest.fn().mockReturnValue(new VisitorId(mockVisitorId)),
      getLifecycle: jest
        .fn()
        .mockReturnValue(new VisitorLifecycleVO(VisitorLifecycle.ANON)),
      getActiveSessions: jest.fn().mockReturnValue([
        {
          getId: jest.fn().mockReturnValue({ value: SessionId.random().value }),
        },
      ]),
    };
    mockEventPublisher.mergeObjectContext.mockReturnValueOnce(
      mockContextIdentify as any,
    );
    mockVisitorRepository.save.mockResolvedValue(okVoid());

    const identifyRes = await request(app.getHttpServer())
      .post('/visitors/identify')
      .send({
        fingerprint: 'fp_cookie_test',
        domain: 'landing.mytech.com',
        apiKey: 'ak_live_1234567890',
      })
      .expect(200);

    // Capturar cookie sid (header puede ser string o string[])
    const setCookieHeader = identifyRes.header['set-cookie'] as
      | string
      | string[]
      | undefined;
    expect(setCookieHeader).toBeDefined();
    const cookiesArray = Array.isArray(setCookieHeader)
      ? setCookieHeader
      : setCookieHeader
        ? [setCookieHeader]
        : [];
    const sidCookie = cookiesArray.find((c) => c.startsWith('sid='));
    expect(sidCookie).toBeDefined();

    // Preparar mock findBySessionId para heartbeat / end
    const visitorForHeartbeat = VisitorV2.create({
      id: new VisitorId(identifyRes.body.visitorId),
      tenantId: new TenantId(mockTenantId),
      siteId: new SiteId(mockSiteId),
      fingerprint: new VisitorFingerprint('fp_cookie_test'),
      lifecycle: new VisitorLifecycleVO(VisitorLifecycle.ANON),
    });
    mockVisitorRepository.findBySessionId.mockResolvedValue(
      ok(visitorForHeartbeat),
    );

    const mockContextHeartbeat = {
      ...visitorForHeartbeat,
      commit: jest.fn(),
      updateSessionActivity: jest.fn(),
      getId: jest
        .fn()
        .mockReturnValue(new VisitorId(identifyRes.body.visitorId)),
    };
    mockEventPublisher.mergeObjectContext.mockReturnValueOnce(
      mockContextHeartbeat as any,
    );

    // 2. heartbeat sin sessionId en body (usa cookie)
    await request(app.getHttpServer())
      .post('/visitors/session/heartbeat')
      .set('Cookie', sidCookie as string)
      .send({ visitorId: identifyRes.body.visitorId })
      .expect(200);

    // 3. endSession sin sessionId en body (usa cookie)
    const mockContextEnd = {
      ...visitorForHeartbeat,
      commit: jest.fn(),
      endCurrentSession: jest.fn(),
      getId: jest
        .fn()
        .mockReturnValue(new VisitorId(identifyRes.body.visitorId)),
    };
    mockEventPublisher.mergeObjectContext.mockReturnValueOnce(
      mockContextEnd as any,
    );

    await request(app.getHttpServer())
      .post('/visitors/session/end')
      .set('Cookie', sidCookie as string)
      .send({ visitorId: identifyRes.body.visitorId, reason: 'cookie-flow' })
      .expect(200);

    // 4. (Opcional) intentar heartbeat de nuevo -> puede ser 404 (sesión terminada) o 200 si mocks no reflejan cierre
    await request(app.getHttpServer())
      .post('/visitors/session/heartbeat')
      .set('Cookie', sidCookie as string)
      .send({ visitorId: identifyRes.body.visitorId })
      .expect((res) => {
        if (![200, 404, 500].includes(res.status)) {
          throw new Error(`Unexpected status ${res.status}`);
        }
      });

    // Aserciones clave
    expect(mockVisitorRepository.findBySessionId).toHaveBeenCalled();
    expect(sidCookie).toContain('HttpOnly');
  });
});
