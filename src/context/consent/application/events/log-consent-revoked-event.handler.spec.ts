import { Test, TestingModule } from '@nestjs/testing';
import { LogConsentRevokedEventHandler } from './log-consent-revoked-event.handler';
import { ConsentRevokedEvent } from '../../domain/events/consent-revoked.event';
import {
  ConsentAuditLogRepository,
  CONSENT_AUDIT_LOG_REPOSITORY,
} from '../../domain/consent-audit-log.repository';
import { okVoid, err } from '../../../shared/domain/result';
import { ConsentPersistenceError } from '../../domain/errors/consent.error';

describe('LogConsentRevokedEventHandler', () => {
  let handler: LogConsentRevokedEventHandler;
  let mockRepository: jest.Mocked<ConsentAuditLogRepository>;

  beforeEach(async () => {
    mockRepository = {
      save: jest.fn(),
      findByVisitorId: jest.fn(),
      findByConsentId: jest.fn(),
      findByDateRange: jest.fn(),
      countByVisitorId: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogConsentRevokedEventHandler,
        {
          provide: CONSENT_AUDIT_LOG_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    handler = module.get<LogConsentRevokedEventHandler>(
      LogConsentRevokedEventHandler,
    );
  });

  it('debe estar definido', () => {
    expect(handler).toBeDefined();
  });

  it('debe crear y guardar un audit log cuando se revoca un consentimiento', async () => {
    mockRepository.save.mockResolvedValue(okVoid());

    const event = new ConsentRevokedEvent({
      consentId: '550e8400-e29b-41d4-a716-446655440000',
      visitorId: '550e8400-e29b-41d4-a716-446655440001',
      consentType: 'privacy_policy',
      revokedAt: new Date().toISOString(),
      reason: 'Usuario solicitó eliminación',
    });

    await handler.handle(event);

    expect(mockRepository.save).toHaveBeenCalledTimes(1);
    const savedAuditLog = mockRepository.save.mock.calls[0][0];
    expect(savedAuditLog.consentId.value).toBe(event.payload.consentId);
    expect(savedAuditLog.visitorId.getValue()).toBe(event.payload.visitorId);
    expect(savedAuditLog.actionType.value).toBe('consent_revoked');
    expect(savedAuditLog.reason).toBe(event.payload.reason);
  });

  it('debe manejar eventos sin razón de revocación', async () => {
    mockRepository.save.mockResolvedValue(okVoid());

    const event = new ConsentRevokedEvent({
      consentId: '550e8400-e29b-41d4-a716-446655440000',
      visitorId: '550e8400-e29b-41d4-a716-446655440001',
      consentType: 'marketing',
      revokedAt: new Date().toISOString(),
    });

    await handler.handle(event);

    expect(mockRepository.save).toHaveBeenCalledTimes(1);
    const savedAuditLog = mockRepository.save.mock.calls[0][0];
    expect(savedAuditLog.reason).toBeNull();
  });

  it('debe manejar errores de persistencia sin lanzar excepciones', async () => {
    const persistenceError = new ConsentPersistenceError(
      'Error de base de datos',
    );
    mockRepository.save.mockResolvedValue(err(persistenceError));

    const event = new ConsentRevokedEvent({
      consentId: '550e8400-e29b-41d4-a716-446655440000',
      visitorId: '550e8400-e29b-41d4-a716-446655440001',
      consentType: 'privacy_policy',
      revokedAt: new Date().toISOString(),
    });

    // No debe lanzar excepción
    await expect(handler.handle(event)).resolves.not.toThrow();
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });
});
