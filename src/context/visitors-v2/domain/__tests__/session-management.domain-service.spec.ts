import { SessionManagementDomainServiceImpl } from '../session-management.domain-service';
import { VisitorV2 } from '../visitor-v2.aggregate';
import { VisitorId } from '../value-objects/visitor-id';
import { TenantId } from '../value-objects/tenant-id';
import { SiteId } from '../value-objects/site-id';
import { VisitorFingerprint } from '../value-objects/visitor-fingerprint';
import { SessionId } from '../value-objects/session-id';
import {
  VisitorLifecycleVO,
  VisitorLifecycle,
} from '../value-objects/visitor-lifecycle';

describe('SessionManagementDomainServiceImpl', () => {
  let service: SessionManagementDomainServiceImpl;

  beforeEach(() => {
    service = new SessionManagementDomainServiceImpl();
  });

  describe('determineTimeoutForVisitor', () => {
    it('debe retornar timeout SHORT para visitante ANON', () => {
      const visitor = VisitorV2.create({
        id: VisitorId.random(),
        tenantId: TenantId.random(),
        siteId: SiteId.random(),
        fingerprint: new VisitorFingerprint('fp_test'),
        lifecycle: VisitorLifecycleVO.anon(),
      });

      const timeout = service.determineTimeoutForVisitor(visitor);
      expect(timeout.toMinutes()).toBe(2); // SHORT = 2 minutos (reducido para testing)
    });

    it('debe retornar timeout MEDIUM para visitante ENGAGED', () => {
      const visitor = VisitorV2.create({
        id: VisitorId.random(),
        tenantId: TenantId.random(),
        siteId: SiteId.random(),
        fingerprint: new VisitorFingerprint('fp_test'),
        lifecycle: new VisitorLifecycleVO(VisitorLifecycle.ENGAGED),
      });

      const timeout = service.determineTimeoutForVisitor(visitor);
      expect(timeout.toMinutes()).toBe(5); // MEDIUM = 5 minutos (reducido para testing)
    });

    it('debe retornar timeout LONG para visitante LEAD', () => {
      const visitor = VisitorV2.create({
        id: VisitorId.random(),
        tenantId: TenantId.random(),
        siteId: SiteId.random(),
        fingerprint: new VisitorFingerprint('fp_test'),
        lifecycle: new VisitorLifecycleVO(VisitorLifecycle.LEAD),
      });

      const timeout = service.determineTimeoutForVisitor(visitor);
      expect(timeout.toMinutes()).toBe(10); // LONG = 10 minutos (reducido para testing)
    });

    it('debe retornar timeout EXTENDED para visitante CONVERTED', () => {
      const visitor = VisitorV2.create({
        id: VisitorId.random(),
        tenantId: TenantId.random(),
        siteId: SiteId.random(),
        fingerprint: new VisitorFingerprint('fp_test'),
        lifecycle: new VisitorLifecycleVO(VisitorLifecycle.CONVERTED),
      });

      const timeout = service.determineTimeoutForVisitor(visitor);
      expect(timeout.toMinutes()).toBe(15); // EXTENDED = 15 minutos (reducido para testing)
    });
  });

  describe('hasExpiredSessions', () => {
    it('debe retornar false si no hay sesiones expiradas', () => {
      const visitor = VisitorV2.create({
        id: VisitorId.random(),
        tenantId: TenantId.random(),
        siteId: SiteId.random(),
        fingerprint: new VisitorFingerprint('fp_test'),
      });

      // La sesión inicial creada tiene lastActivity = now
      expect(service.hasExpiredSessions(visitor)).toBe(false);
    });

    it('debe retornar true si hay sesiones expiradas', () => {
      // Crear visitante con sesión expirada (más de 2 minutos para ANON)
      const visitor = VisitorV2.fromPrimitives({
        id: VisitorId.random().getValue(),
        tenantId: TenantId.random().getValue(),
        siteId: SiteId.random().getValue(),
        fingerprint: 'fp_test',
        lifecycle: VisitorLifecycle.ANON,
            isInternal: false,        hasAcceptedPrivacyPolicy: false,
        privacyPolicyAcceptedAt: null,
        consentVersion: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sessions: [
          {
            id: SessionId.random().getValue(),
            startedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutos atrás
            lastActivityAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutos atrás (> 2 min timeout)
            // sin endedAt = sesión activa
          },
        ],
      });

      expect(service.hasExpiredSessions(visitor)).toBe(true);
    });

    it('debe retornar false si la sesión está cerrada aunque sea antigua', () => {
      const visitor = VisitorV2.fromPrimitives({
        id: VisitorId.random().getValue(),
        tenantId: TenantId.random().getValue(),
        siteId: SiteId.random().getValue(),
        fingerprint: 'fp_test',
        lifecycle: VisitorLifecycle.ANON,
            isInternal: false,        hasAcceptedPrivacyPolicy: false,
        privacyPolicyAcceptedAt: null,
        consentVersion: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sessions: [
          {
            id: SessionId.random().getValue(),
            startedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            lastActivityAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            endedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // ya cerrada
          },
        ],
      });

      expect(service.hasExpiredSessions(visitor)).toBe(false);
    });
  });

  describe('cleanExpiredSessions', () => {
    it('debe cerrar todas las sesiones activas expiradas', () => {
      // Crear visitante con múltiples sesiones expiradas (timeout ANON = 2 min)
      const visitor = VisitorV2.fromPrimitives({
        id: VisitorId.random().getValue(),
        tenantId: TenantId.random().getValue(),
        siteId: SiteId.random().getValue(),
        fingerprint: 'fp_test',
        lifecycle: VisitorLifecycle.ANON,
            isInternal: false,        hasAcceptedPrivacyPolicy: false,
        privacyPolicyAcceptedAt: null,
        consentVersion: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sessions: [
          {
            id: SessionId.random().getValue(),
            startedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
            lastActivityAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
            // activa pero expirada (20 min > 2 min timeout)
          },
          {
            id: SessionId.random().getValue(),
            startedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            lastActivityAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            // activa pero expirada (10 min > 2 min timeout)
          },
          {
            id: SessionId.random().getValue(),
            startedAt: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
            lastActivityAt: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
            // activa y NO expirada (1 min < 2 min timeout)
          },
        ],
      });

      // Verificar que hay 3 sesiones activas inicialmente
      expect(visitor.getActiveSessions().length).toBe(3);

      // Limpiar sesiones expiradas
      const cleanedVisitor = service.cleanExpiredSessions(visitor);

      // Verificar que solo queda 1 sesión activa (la que no expiró)
      expect(cleanedVisitor.getActiveSessions().length).toBe(1);

      // Verificar que hay 2 sesiones cerradas
      const closedSessions = cleanedVisitor
        .getSessions()
        .filter((s) => !s.isActive());
      expect(closedSessions.length).toBe(2);
    });

    it('no debe cerrar sesiones que no están expiradas', () => {
      const visitor = VisitorV2.create({
        id: VisitorId.random(),
        tenantId: TenantId.random(),
        siteId: SiteId.random(),
        fingerprint: new VisitorFingerprint('fp_test'),
      });

      // Sesión recién creada no debe estar expirada
      const cleanedVisitor = service.cleanExpiredSessions(visitor);
      expect(cleanedVisitor.getActiveSessions().length).toBe(1);
    });
  });

  describe('shouldBeMarkedAsInactive', () => {
    it('debe retornar true si todas las sesiones activas están expiradas', () => {
      const visitor = VisitorV2.fromPrimitives({
        id: VisitorId.random().getValue(),
        tenantId: TenantId.random().getValue(),
        siteId: SiteId.random().getValue(),
        fingerprint: 'fp_test',
        lifecycle: VisitorLifecycle.ANON,
            isInternal: false,        hasAcceptedPrivacyPolicy: false,
        privacyPolicyAcceptedAt: null,
        consentVersion: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sessions: [
          {
            id: SessionId.random().getValue(),
            startedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            lastActivityAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          },
        ],
      });

      expect(service.shouldBeMarkedAsInactive(visitor)).toBe(true);
    });

    it('debe retornar false si tiene sesiones activas no expiradas', () => {
      const visitor = VisitorV2.create({
        id: VisitorId.random(),
        tenantId: TenantId.random(),
        siteId: SiteId.random(),
        fingerprint: new VisitorFingerprint('fp_test'),
      });

      expect(service.shouldBeMarkedAsInactive(visitor)).toBe(false);
    });
  });
});
