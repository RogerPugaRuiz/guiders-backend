import { VisitorConsent } from '../visitor-consent.aggregate';
import { ConsentStatus } from '../value-objects/consent-status';
import { ConsentRenewedEvent } from '../events/consent-renewed.event';

const buildConsent = (
  status: ConsentStatus = ConsentStatus.granted(),
  expiresAt: Date | null = new Date('2025-12-31T23:59:59.999Z'),
): VisitorConsent => {
  const primitives = {
    id: '11111111-1111-4111-8111-111111111111',
    visitorId: '22222222-2222-4222-8222-222222222222',
    consentType: 'privacy_policy',
    status: status.value,
    version: 'v1.4.0', // Actualizado para ser compatible con semver
    grantedAt: '2025-01-01T00:00:00.000Z',
    revokedAt: status.isRevoked() ? '2025-06-01T00:00:00.000Z' : undefined,
    expiresAt: expiresAt?.toISOString(),
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    metadata: {},
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  };

  return VisitorConsent.fromPrimitives(primitives);
};

describe('VisitorConsent - renew()', () => {
  it('debe renovar un consentimiento con éxito y emitir evento', () => {
    // Given
    const consent = buildConsent();
    const newExpiresAt = new Date('2026-12-31T23:59:59.999Z');

    // When
    const renewed = consent.renew(newExpiresAt);

    // Then
    expect(renewed.expiresAt).toEqual(newExpiresAt);
    expect(renewed.status.value).toBe('granted');

    // Verificar evento emitido
    const events: any[] = (renewed as any).getUncommittedEvents
      ? (renewed as any).getUncommittedEvents()
      : [];
    const event = events.find((e) => e instanceof ConsentRenewedEvent);
    expect(event).toBeDefined();
    expect(event?.payload.newExpiresAt).toBe(newExpiresAt.toISOString());
  });

  it('debe lanzar error si intenta renovar un consentimiento revocado', () => {
    // Given
    const revokedConsent = buildConsent(ConsentStatus.revoked());
    const newExpiresAt = new Date('2026-12-31T23:59:59.999Z');

    // When & Then
    expect(() => revokedConsent.renew(newExpiresAt)).toThrow(
      'No se puede renovar un consentimiento revocado',
    );
  });

  it('debe lanzar error si intenta renovar un consentimiento expirado', () => {
    // Given
    const expiredConsent = buildConsent(ConsentStatus.expired());
    const newExpiresAt = new Date('2026-12-31T23:59:59.999Z');

    // When & Then
    expect(() => expiredConsent.renew(newExpiresAt)).toThrow(
      'No se puede renovar un consentimiento expirado',
    );
  });

  it('debe lanzar error si la nueva fecha de expiración no es futura', () => {
    // Given
    const consent = buildConsent();
    const pastDate = new Date('2020-01-01T00:00:00.000Z');

    // When & Then
    expect(() => consent.renew(pastDate)).toThrow(
      'La nueva fecha de expiración debe ser posterior a la fecha actual',
    );
  });

  it('debe preservar los datos originales del consentimiento', () => {
    // Given
    const consent = buildConsent();
    const originalId = consent.id.value;
    const originalVisitorId = consent.visitorId.getValue();
    const originalGrantedAt = consent.grantedAt;
    const newExpiresAt = new Date('2026-12-31T23:59:59.999Z');

    // When
    const renewed = consent.renew(newExpiresAt);

    // Then
    expect(renewed.id.value).toBe(originalId);
    expect(renewed.visitorId.getValue()).toBe(originalVisitorId);
    expect(renewed.grantedAt).toEqual(originalGrantedAt);
  });

  it('isExpiringSoon debe detectar consentimientos próximos a expirar', () => {
    // Given - Consentimiento que expira en 15 días
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 15);
    const consent = buildConsent(ConsentStatus.granted(), futureDate);

    // When & Then
    expect(consent.isExpiringSoon(30)).toBe(true); // 30 días de anticipación
    expect(consent.isExpiringSoon(10)).toBe(false); // 10 días de anticipación
  });

  it('isExpiringSoon debe retornar false para consentimientos sin fecha de expiración', () => {
    // Given
    const consent = buildConsent(ConsentStatus.granted(), null);

    // When & Then
    expect(consent.isExpiringSoon()).toBe(false);
  });

  it('isExpiringSoon debe retornar false para consentimientos ya expirados', () => {
    // Given - Consentimiento expirado hace 10 días
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);
    const consent = buildConsent(ConsentStatus.granted(), pastDate);

    // When & Then
    expect(consent.isExpiringSoon()).toBe(false);
  });
});
