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
});
