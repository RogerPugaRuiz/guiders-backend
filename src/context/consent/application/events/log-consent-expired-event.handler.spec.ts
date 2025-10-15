import { Test, TestingModule } from '@nestjs/testing';
import { LogConsentExpiredEventHandler } from './log-consent-expired-event.handler';
import { ConsentExpiredEvent } from '../../domain/events/consent-expired.event';
import {
  ConsentAuditLogRepository,
  CONSENT_AUDIT_LOG_REPOSITORY,
} from '../../domain/consent-audit-log.repository';
import { okVoid, err } from '../../../shared/domain/result';
import { ConsentPersistenceError } from '../../domain/errors/consent.error';

describe('LogConsentExpiredEventHandler', () => {
  let handler: LogConsentExpiredEventHandler;
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
        LogConsentExpiredEventHandler,
        {
          provide: CONSENT_AUDIT_LOG_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    handler = module.get<LogConsentExpiredEventHandler>(
      LogConsentExpiredEventHandler,
    );
  });

  it('debe estar definido', () => {
    expect(handler).toBeDefined();
  });

  it('debe crear y guardar un audit log cuando expira un consentimiento', async () => {
    mockRepository.save.mockResolvedValue(okVoid());

    const expiredDate = new Date('2024-12-31T23:59:59.000Z');
    const event = new ConsentExpiredEvent({
      consentId: '550e8400-e29b-41d4-a716-446655440000',
      visitorId: '550e8400-e29b-41d4-a716-446655440001',
      consentType: 'marketing',
      expiredAt: expiredDate.toISOString(),
    });

    await handler.handle(event);

    expect(mockRepository.save).toHaveBeenCalledTimes(1);
    const savedAuditLog = mockRepository.save.mock.calls[0][0];
    expect(savedAuditLog.consentId.value).toBe(event.payload.consentId);
    expect(savedAuditLog.visitorId.getValue()).toBe(event.payload.visitorId);
    expect(savedAuditLog.actionType.value).toBe('consent_expired');
    expect(savedAuditLog.metadata).toHaveProperty('expiredAt');
  });

  it('debe manejar errores de persistencia sin lanzar excepciones', async () => {
    const persistenceError = new ConsentPersistenceError(
      'Error de base de datos',
    );
    mockRepository.save.mockResolvedValue(err(persistenceError));

    const event = new ConsentExpiredEvent({
      consentId: '550e8400-e29b-41d4-a716-446655440000',
      visitorId: '550e8400-e29b-41d4-a716-446655440001',
      consentType: 'analytics',
      expiredAt: new Date().toISOString(),
    });

    // No debe lanzar excepción
    await expect(handler.handle(event)).resolves.not.toThrow();
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });

  it('debe manejar errores inesperados sin lanzar excepciones', async () => {
    mockRepository.save.mockRejectedValue(new Error('Error inesperado'));

    const event = new ConsentExpiredEvent({
      consentId: '550e8400-e29b-41d4-a716-446655440000',
      visitorId: '550e8400-e29b-41d4-a716-446655440001',
      consentType: 'privacy_policy',
      expiredAt: new Date().toISOString(),
    });

    // No debe lanzar excepción
    await expect(handler.handle(event)).resolves.not.toThrow();
  });
});
