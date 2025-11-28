import { VisitorV2 } from '../visitor-v2.aggregate';
import { VisitorId } from '../value-objects/visitor-id';
import { TenantId } from '../value-objects/tenant-id';
import { SiteId } from '../value-objects/site-id';
import { VisitorFingerprint } from '../value-objects/visitor-fingerprint';
import { SessionId } from '../value-objects/session-id';
import { VisitorLifecycle } from '../value-objects/visitor-lifecycle';

describe('VisitorV2 - Session Management', () => {
  describe('endSession', () => {
    it('debe finalizar una sesión específica por su ID', () => {
      const sessionId = SessionId.random();
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
            id: sessionId.getValue(),
            startedAt: new Date().toISOString(),
            lastActivityAt: new Date().toISOString(),
          },
        ],
      });

      // Verificar que la sesión está activa
      expect(visitor.getActiveSessions().length).toBe(1);

      // Finalizar la sesión específica
      visitor.endSession(sessionId);

      // Verificar que ya no hay sesiones activas
      expect(visitor.getActiveSessions().length).toBe(0);
    });

    it('no debe hacer nada si la sesión no existe', () => {
      const visitor = VisitorV2.create({
        id: VisitorId.random(),
        tenantId: TenantId.random(),
        siteId: SiteId.random(),
        fingerprint: new VisitorFingerprint('fp_test'),
      });

      const nonExistentSessionId = SessionId.random();

      // Debe tener 1 sesión activa inicial
      expect(visitor.getActiveSessions().length).toBe(1);

      // Intentar cerrar sesión inexistente
      visitor.endSession(nonExistentSessionId);

      // La sesión activa debe seguir ahí
      expect(visitor.getActiveSessions().length).toBe(1);
    });

    it('no debe hacer nada si la sesión ya está cerrada', () => {
      const sessionId = SessionId.random();
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
            id: sessionId.getValue(),
            startedAt: new Date().toISOString(),
            lastActivityAt: new Date().toISOString(),
            endedAt: new Date().toISOString(), // ya cerrada
          },
        ],
      });

      // Verificar que no hay sesiones activas
      expect(visitor.getActiveSessions().length).toBe(0);

      // Intentar cerrar sesión ya cerrada (no debe causar error)
      visitor.endSession(sessionId);

      // Sigue sin sesiones activas
      expect(visitor.getActiveSessions().length).toBe(0);
    });
  });

  describe('endSessionsWhere', () => {
    it('debe finalizar múltiples sesiones que cumplan el predicado', () => {
      const oldTime = new Date(Date.now() - 10 * 60 * 1000); // 10 minutos atrás
      const recentTime = new Date(Date.now() - 1 * 60 * 1000); // 1 minuto atrás

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
            startedAt: oldTime.toISOString(),
            lastActivityAt: oldTime.toISOString(),
          },
          {
            id: SessionId.random().getValue(),
            startedAt: oldTime.toISOString(),
            lastActivityAt: oldTime.toISOString(),
          },
          {
            id: SessionId.random().getValue(),
            startedAt: recentTime.toISOString(),
            lastActivityAt: recentTime.toISOString(),
          },
        ],
      });

      // Verificar que hay 3 sesiones activas
      expect(visitor.getActiveSessions().length).toBe(3);

      // Cerrar sesiones con actividad hace más de 5 minutos
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      visitor.endSessionsWhere(
        (session) => session.getLastActivityAt().getTime() < fiveMinutesAgo,
      );

      // Solo debe quedar 1 sesión activa (la reciente)
      expect(visitor.getActiveSessions().length).toBe(1);

      // Verificar que hay 2 sesiones cerradas
      const closedSessions = visitor.getSessions().filter((s) => !s.isActive());
      expect(closedSessions.length).toBe(2);
    });

    it('no debe cerrar sesiones si el predicado no coincide', () => {
      const visitor = VisitorV2.create({
        id: VisitorId.random(),
        tenantId: TenantId.random(),
        siteId: SiteId.random(),
        fingerprint: new VisitorFingerprint('fp_test'),
      });

      // Debe tener 1 sesión activa
      expect(visitor.getActiveSessions().length).toBe(1);

      // Predicado que nunca coincide
      visitor.endSessionsWhere(() => false);

      // La sesión debe seguir activa
      expect(visitor.getActiveSessions().length).toBe(1);
    });

    it('no debe afectar sesiones ya cerradas', () => {
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
          {
            id: SessionId.random().getValue(),
            startedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            lastActivityAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            // activa
          },
        ],
      });

      // Verificar estado inicial
      expect(visitor.getActiveSessions().length).toBe(1);
      const initialClosedCount = visitor
        .getSessions()
        .filter((s) => !s.isActive()).length;
      expect(initialClosedCount).toBe(1);

      // Cerrar todas las sesiones con actividad antigua
      visitor.endSessionsWhere(() => true);

      // Debe quedar 0 activas y 2 cerradas
      expect(visitor.getActiveSessions().length).toBe(0);
      expect(visitor.getSessions().filter((s) => !s.isActive()).length).toBe(2);
    });
  });

  describe('endCurrentSession', () => {
    it('debe seguir funcionando para cerrar la primera sesión activa', () => {
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
            startedAt: new Date().toISOString(),
            lastActivityAt: new Date().toISOString(),
          },
          {
            id: SessionId.random().getValue(),
            startedAt: new Date().toISOString(),
            lastActivityAt: new Date().toISOString(),
          },
        ],
      });

      // Verificar que hay 2 sesiones activas
      expect(visitor.getActiveSessions().length).toBe(2);

      // Cerrar la sesión actual (primera activa)
      visitor.endCurrentSession();

      // Debe quedar 1 sesión activa
      expect(visitor.getActiveSessions().length).toBe(1);
    });
  });
});
