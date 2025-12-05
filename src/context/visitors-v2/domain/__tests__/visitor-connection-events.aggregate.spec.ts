import { VisitorV2 } from '../visitor-v2.aggregate';
import { VisitorId } from '../value-objects/visitor-id';
import { TenantId } from '../value-objects/tenant-id';
import { SiteId } from '../value-objects/site-id';
import { VisitorFingerprint } from '../value-objects/visitor-fingerprint';
import {
  VisitorLifecycleVO,
  VisitorLifecycle,
} from '../value-objects/visitor-lifecycle';
import { VisitorConnectionChangedEvent } from '../events/visitor-connection-changed.event';
import { ConnectionStatus } from '../value-objects/visitor-connection';

const buildVisitor = () =>
  VisitorV2.create({
    id: new VisitorId('11111111-1111-4111-8111-111111111111'),
    tenantId: new TenantId('22222222-2222-4222-8222-222222222222'),
    siteId: new SiteId('33333333-3333-4333-8333-333333333333'),
    fingerprint: new VisitorFingerprint('fp_test'),
    lifecycle: new VisitorLifecycleVO(VisitorLifecycle.ANON),
  });

describe('VisitorV2 conexión eventos', () => {
  it('emite evento goOnline', () => {
    const v = buildVisitor();
    v.goOnline();
    const events: any[] = (v as any).getUncommittedEvents
      ? (v as any).getUncommittedEvents()
      : [];
    const evt = events.find((e) => e instanceof VisitorConnectionChangedEvent);
    expect(evt).toBeDefined();
    expect(evt?.attributes.newConnection).toBe('online');
  });

  it('emite eventos en cadena online -> chatting -> offline', () => {
    const v = buildVisitor();
    v.goOnline();
    v.startChatting();
    v.goOffline();
    const events: any[] = (
      (v as any).getUncommittedEvents ? (v as any).getUncommittedEvents() : []
    ).filter((e) => e instanceof VisitorConnectionChangedEvent);
    expect(events).toHaveLength(3);
    expect(events[0].attributes.newConnection).toBe('online');
    expect(events[1].attributes.newConnection).toBe('chatting');
    expect(events[2].attributes.newConnection).toBe('offline');
  });

  describe('persistencia del estado de conexión', () => {
    it('inicializa con estado OFFLINE por defecto', () => {
      const v = buildVisitor();
      expect(v.getConnectionStatus()).toBe(ConnectionStatus.OFFLINE);
    });

    it('actualiza estado interno al llamar goOnline()', () => {
      const v = buildVisitor();
      v.goOnline();
      expect(v.getConnectionStatus()).toBe(ConnectionStatus.ONLINE);
    });

    it('actualiza estado interno al llamar goAway()', () => {
      const v = buildVisitor();
      v.goOnline();
      v.goAway();
      expect(v.getConnectionStatus()).toBe(ConnectionStatus.AWAY);
    });

    it('actualiza estado interno al llamar startChatting()', () => {
      const v = buildVisitor();
      v.goOnline();
      v.startChatting();
      expect(v.getConnectionStatus()).toBe(ConnectionStatus.CHATTING);
    });

    it('actualiza estado interno al llamar stopChatting()', () => {
      const v = buildVisitor();
      v.goOnline();
      v.startChatting();
      v.stopChatting();
      expect(v.getConnectionStatus()).toBe(ConnectionStatus.ONLINE);
    });

    it('actualiza estado interno al llamar returnFromAway()', () => {
      const v = buildVisitor();
      v.goOnline();
      v.goAway();
      v.returnFromAway();
      expect(v.getConnectionStatus()).toBe(ConnectionStatus.ONLINE);
    });

    it('actualiza estado interno al llamar goOffline()', () => {
      const v = buildVisitor();
      v.goOnline();
      v.goOffline();
      expect(v.getConnectionStatus()).toBe(ConnectionStatus.OFFLINE);
    });

    it('incluye connectionStatus en toPrimitives()', () => {
      const v = buildVisitor();
      v.goOnline();
      const primitives = v.toPrimitives();
      expect(primitives.connectionStatus).toBe(ConnectionStatus.ONLINE);
    });

    it('restaura connectionStatus desde fromPrimitives()', () => {
      const v = buildVisitor();
      v.goOnline();
      v.goAway();
      const primitives = v.toPrimitives();

      const restored = VisitorV2.fromPrimitives(primitives);
      expect(restored.getConnectionStatus()).toBe(ConnectionStatus.AWAY);
    });

    it('usa OFFLINE por defecto si connectionStatus no está en primitivos', () => {
      const primitives = {
        id: '11111111-1111-4111-8111-111111111111',
        tenantId: '22222222-2222-4222-8222-222222222222',
        siteId: '33333333-3333-4333-8333-333333333333',
        fingerprint: 'fp_test',
        lifecycle: VisitorLifecycle.ANON,
        isInternal: false,
        connectionStatus: undefined as any, // Simular datos legacy sin connectionStatus
        hasAcceptedPrivacyPolicy: false,
        privacyPolicyAcceptedAt: null,
        consentVersion: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sessions: [],
      };

      const restored = VisitorV2.fromPrimitives(primitives);
      expect(restored.getConnectionStatus()).toBe(ConnectionStatus.OFFLINE);
    });

    it('emite eventos con previousConnection correcto', () => {
      const v = buildVisitor();
      v.goOnline();
      v.startChatting();

      const events: any[] = (
        (v as any).getUncommittedEvents ? (v as any).getUncommittedEvents() : []
      ).filter((e) => e instanceof VisitorConnectionChangedEvent);

      // Primer evento: offline -> online
      expect(events[0].attributes.previousConnection).toBe(
        ConnectionStatus.OFFLINE,
      );
      expect(events[0].attributes.newConnection).toBe(ConnectionStatus.ONLINE);

      // Segundo evento: online -> chatting
      expect(events[1].attributes.previousConnection).toBe(
        ConnectionStatus.ONLINE,
      );
      expect(events[1].attributes.newConnection).toBe(
        ConnectionStatus.CHATTING,
      );
    });
  });
});
