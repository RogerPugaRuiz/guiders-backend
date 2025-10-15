import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { CqrsModule } from '@nestjs/cqrs';
import { ConsentController } from '../src/context/consent/infrastructure/controllers/consent.controller';
import { RevokeConsentCommandHandler } from '../src/context/consent/application/commands/revoke-consent.command-handler';
import { RenewConsentCommandHandler } from '../src/context/consent/application/commands/renew-consent.command-handler';
import { GetVisitorConsentHistoryQueryHandler } from '../src/context/consent/application/queries/get-visitor-consent-history.query-handler';
import { GetVisitorAuditLogsQueryHandler } from '../src/context/consent/application/queries/get-visitor-audit-logs.query-handler';
import {
  ConsentRepository,
  CONSENT_REPOSITORY,
} from '../src/context/consent/domain/consent.repository';
import {
  ConsentAuditLogRepository,
  CONSENT_AUDIT_LOG_REPOSITORY,
} from '../src/context/consent/domain/consent-audit-log.repository';
import { VisitorConsent } from '../src/context/consent/domain/visitor-consent.aggregate';
import { ConsentAuditLog } from '../src/context/consent/domain/consent-audit-log.aggregate';
import { ConsentType } from '../src/context/consent/domain/value-objects/consent-type';
import { ConsentVersion } from '../src/context/consent/domain/value-objects/consent-version';
import { AuditActionType } from '../src/context/consent/domain/value-objects/audit-action-type';
import { DualAuthGuard } from '../src/context/shared/infrastructure/guards/dual-auth.guard';
import { RolesGuard } from '../src/context/shared/infrastructure/guards/role.guard';
import { ok, okVoid } from '../src/context/shared/domain/result';

/**
 * E2E Test para ConsentController
 * Valida los endpoints de:
 * - Revocaci�n de consentimientos (RGPD Art. 7.3)
 * - Consulta de historial (RGPD Art. 15)
 */
describe('ConsentController (e2e)', () => {
  let app: INestApplication;
  let mockConsentRepository: jest.Mocked<ConsentRepository>;
  let mockAuditLogRepository: jest.Mocked<ConsentAuditLogRepository>;

  const visitorId = '550e8400-e29b-41d4-a716-446655440002';
  const consentId = '550e8400-e29b-41d4-a716-446655440000';

  const mockConsent = VisitorConsent.grant({
    visitorId,
    consentType: new ConsentType('privacy_policy'),
    version: ConsentVersion.fromString('v1.4.0'),
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
  });

  const mockAuditLog = ConsentAuditLog.create({
    consentId,
    visitorId,
    actionType: AuditActionType.granted(),
    consentType: 'privacy_policy',
    consentVersion: 'v1.4.0',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
  });

  beforeAll(async () => {
    mockConsentRepository = {
      save: jest.fn(),
      findByVisitorId: jest.fn(),
      findActiveConsentByType: jest.fn(),
      hasActiveConsent: jest.fn(),
    } as any;

    mockAuditLogRepository = {
      save: jest.fn(),
      findByVisitorId: jest.fn(),
      findByConsentId: jest.fn(),
      findByDateRange: jest.fn(),
      countByVisitorId: jest.fn(),
    } as any;

    const mockAuthGuard = {
      canActivate: jest.fn((context) => {
        const req = context.switchToHttp().getRequest();
        req.user = {
          id: 'visitor-1',
          roles: ['visitor'],
          visitorId,
        };
        return true;
      }),
    };

    const mockRolesGuard = {
      canActivate: jest.fn(() => true),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      controllers: [ConsentController],
      providers: [
        RevokeConsentCommandHandler,
        RenewConsentCommandHandler,
        GetVisitorConsentHistoryQueryHandler,
        GetVisitorAuditLogsQueryHandler,
        {
          provide: CONSENT_REPOSITORY,
          useValue: mockConsentRepository,
        },
        {
          provide: CONSENT_AUDIT_LOG_REPOSITORY,
          useValue: mockAuditLogRepository,
        },
      ],
    })
      .overrideGuard(DualAuthGuard)
      .useValue(mockAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /consents/revoke', () => {
    it('debe revocar un consentimiento exitosamente', async () => {
      mockConsentRepository.findActiveConsentByType.mockResolvedValue(
        ok(mockConsent),
      );
      mockConsentRepository.save.mockResolvedValue(okVoid());

      const res = await request(app.getHttpServer())
        .post('/consents/revoke')
        .send({
          visitorId,
          consentType: 'privacy_policy',
          reason: 'Usuario solicit� revocaci�n',
        })
        .expect(200);

      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('revocado exitosamente');
      expect(mockConsentRepository.save).toHaveBeenCalled();
    });

    it('debe fallar cuando el consentimiento no existe', async () => {
      mockConsentRepository.findActiveConsentByType.mockResolvedValue(ok(null));

      const res = await request(app.getHttpServer())
        .post('/consents/revoke')
        .send({
          visitorId,
          consentType: 'marketing',
        })
        .expect(400);

      expect(res.body).toHaveProperty('message');
    });

    it('debe fallar con datos inv�lidos', async () => {
      await request(app.getHttpServer())
        .post('/consents/revoke')
        .send({
          visitorId,
          // falta consentType
        })
        .expect(400);
    });
  });

  describe('GET /consents/visitors/:visitorId', () => {
    it('debe retornar el historial de consentimientos', async () => {
      const consents = [mockConsent];
      mockConsentRepository.findByVisitorId.mockResolvedValue(ok(consents));

      const res = await request(app.getHttpServer())
        .get(`/consents/visitors/${visitorId}`)
        .expect(200);

      expect(res.body).toHaveProperty('consents');
      expect(res.body).toHaveProperty('total');
      expect(Array.isArray(res.body.consents)).toBe(true);
      expect(res.body.total).toBe(1);
      expect(res.body.consents[0]).toHaveProperty('id');
      expect(res.body.consents[0]).toHaveProperty('visitorId');
      expect(res.body.consents[0]).toHaveProperty('consentType');
      expect(res.body.consents[0]).toHaveProperty('status');
    });

    it('debe retornar lista vac�a cuando no hay consentimientos', async () => {
      mockConsentRepository.findByVisitorId.mockResolvedValue(ok([]));

      const res = await request(app.getHttpServer())
        .get(`/consents/visitors/${visitorId}`)
        .expect(200);

      expect(res.body.consents).toHaveLength(0);
      expect(res.body.total).toBe(0);
    });
  });

  describe('GET /consents/visitors/:visitorId/audit-logs', () => {
    it('debe retornar los audit logs de un visitante', async () => {
      const auditLogs = [mockAuditLog];
      mockAuditLogRepository.findByVisitorId.mockResolvedValue(ok(auditLogs));

      const res = await request(app.getHttpServer())
        .get(`/consents/visitors/${visitorId}/audit-logs`)
        .expect(200);

      expect(res.body).toHaveProperty('auditLogs');
      expect(res.body).toHaveProperty('total');
      expect(Array.isArray(res.body.auditLogs)).toBe(true);
      expect(res.body.total).toBe(1);
      expect(res.body.auditLogs[0]).toHaveProperty('id');
      expect(res.body.auditLogs[0]).toHaveProperty('consentId');
      expect(res.body.auditLogs[0]).toHaveProperty('visitorId');
      expect(res.body.auditLogs[0]).toHaveProperty('actionType');
      expect(res.body.auditLogs[0]).toHaveProperty('consentType');
      expect(res.body.auditLogs[0]).toHaveProperty('timestamp');
    });

    it('debe retornar lista vac�a cuando no hay audit logs', async () => {
      mockAuditLogRepository.findByVisitorId.mockResolvedValue(ok([]));

      const res = await request(app.getHttpServer())
        .get(`/consents/visitors/${visitorId}/audit-logs`)
        .expect(200);

      expect(res.body.auditLogs).toHaveLength(0);
      expect(res.body.total).toBe(0);
    });

    it('debe incluir metadata en los audit logs cuando est� disponible', async () => {
      const auditLogWithMetadata = ConsentAuditLog.create({
        consentId,
        visitorId,
        actionType: AuditActionType.revoked(),
        consentType: 'marketing',
        reason: 'Usuario solicit� revocaci�n',
        metadata: { test: 'data' },
      });

      mockAuditLogRepository.findByVisitorId.mockResolvedValue(
        ok([auditLogWithMetadata]),
      );

      const res = await request(app.getHttpServer())
        .get(`/consents/visitors/${visitorId}/audit-logs`)
        .expect(200);

      expect(res.body.auditLogs[0]).toHaveProperty('metadata');
      expect(res.body.auditLogs[0]).toHaveProperty('reason');
      expect(res.body.auditLogs[0].actionType).toBe('consent_revoked');
    });
  });

  describe('POST /consents/renew', () => {
    it('debe renovar un consentimiento exitosamente', async () => {
      const newExpiresAt = new Date('2026-12-31T23:59:59.999Z');

      mockConsentRepository.findActiveConsentByType.mockResolvedValue(
        ok(mockConsent),
      );
      mockConsentRepository.save.mockResolvedValue(okVoid());

      const res = await request(app.getHttpServer())
        .post('/consents/renew')
        .send({
          visitorId,
          consentType: 'privacy_policy',
          newExpiresAt: newExpiresAt.toISOString(),
        })
        .expect(200);

      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('renovado exitosamente');
      expect(mockConsentRepository.save).toHaveBeenCalled();
    });

    it('debe fallar cuando el consentimiento no existe', async () => {
      const newExpiresAt = new Date('2026-12-31T23:59:59.999Z');

      mockConsentRepository.findActiveConsentByType.mockResolvedValue(ok(null));

      const res = await request(app.getHttpServer())
        .post('/consents/renew')
        .send({
          visitorId,
          consentType: 'marketing',
          newExpiresAt: newExpiresAt.toISOString(),
        })
        .expect(404);

      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('No se encontró');
    });

    it('debe fallar con datos inválidos - falta newExpiresAt', async () => {
      // Reset mock - DTO validation debería fallar antes de llamar al repository
      mockConsentRepository.findActiveConsentByType.mockReset();

      await request(app.getHttpServer())
        .post('/consents/renew')
        .send({
          visitorId,
          consentType: 'privacy_policy',
          // falta newExpiresAt
        })
        .expect(400);
    });

    it('debe fallar con datos inválidos - fecha no es ISO8601', async () => {
      // Reset mock - DTO validation debería fallar antes de llamar al repository
      mockConsentRepository.findActiveConsentByType.mockReset();

      await request(app.getHttpServer())
        .post('/consents/renew')
        .send({
          visitorId,
          consentType: 'privacy_policy',
          newExpiresAt: 'invalid-date',
        })
        .expect(400);
    });

    it('debe fallar con datos inválidos - consentType no válido', async () => {
      const newExpiresAt = new Date('2026-12-31T23:59:59.999Z');

      await request(app.getHttpServer())
        .post('/consents/renew')
        .send({
          visitorId,
          consentType: 'invalid_type',
          newExpiresAt: newExpiresAt.toISOString(),
        })
        .expect(400);
    });
  });
});
