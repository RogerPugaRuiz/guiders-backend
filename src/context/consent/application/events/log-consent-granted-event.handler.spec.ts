import { Test, TestingModule } from '@nestjs/testing';
import { LogConsentGrantedEventHandler } from './log-consent-granted-event.handler';
import { ConsentGrantedEvent } from '../../domain/events/consent-granted.event';
import {
  ConsentAuditLogRepository,
  CONSENT_AUDIT_LOG_REPOSITORY,
} from '../../domain/consent-audit-log.repository';
import { okVoid, err } from '../../../shared/domain/result';
import { ConsentPersistenceError } from '../../domain/errors/consent.error';

describe('LogConsentGrantedEventHandler', () => {
  let handler: LogConsentGrantedEventHandler;
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
        LogConsentGrantedEventHandler,
        {
          provide: CONSENT_AUDIT_LOG_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    handler = module.get<LogConsentGrantedEventHandler>(
      LogConsentGrantedEventHandler,
    );
  });

  it('debe estar definido', () => {
    expect(handler).toBeDefined();
  });

  it('debe crear y guardar un audit log cuando se otorga un consentimiento', async () => {
    mockRepository.save.mockResolvedValue(okVoid());

    const event = new ConsentGrantedEvent({
      consentId: '550e8400-e29b-41d4-a716-446655440000',
      visitorId: '550e8400-e29b-41d4-a716-446655440001',
      consentType: 'privacy_policy',
      version: 'v1.0.0',
      grantedAt: new Date().toISOString(),
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    });

    await handler.handle(event);

    expect(mockRepository.save).toHaveBeenCalledTimes(1);
    const savedAuditLog = mockRepository.save.mock.calls[0][0];
    expect(savedAuditLog.consentId.value).toBe(event.payload.consentId);
    expect(savedAuditLog.visitorId.getValue()).toBe(event.payload.visitorId);
    expect(savedAuditLog.actionType.value).toBe('consent_granted');
  });

  it('debe manejar errores de persistencia sin lanzar excepciones', async () => {
    const persistenceError = new ConsentPersistenceError(
      'Error de base de datos',
    );
    mockRepository.save.mockResolvedValue(err(persistenceError));

    const event = new ConsentGrantedEvent({
      consentId: '550e8400-e29b-41d4-a716-446655440000',
      visitorId: '550e8400-e29b-41d4-a716-446655440001',
      consentType: 'privacy_policy',
      version: 'v1.0.0',
      grantedAt: new Date().toISOString(),
      ipAddress: '192.168.1.1',
    });

    // No debe lanzar excepción
    await expect(handler.handle(event)).resolves.not.toThrow();
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });

  it('debe manejar errores inesperados sin lanzar excepciones', async () => {
    mockRepository.save.mockRejectedValue(new Error('Error inesperado'));

    const event = new ConsentGrantedEvent({
      consentId: '550e8400-e29b-41d4-a716-446655440000',
      visitorId: '550e8400-e29b-41d4-a716-446655440001',
      consentType: 'privacy_policy',
      version: 'v1.0.0',
      grantedAt: new Date().toISOString(),
      ipAddress: '192.168.1.1',
    });

    // No debe lanzar excepción
    await expect(handler.handle(event)).resolves.not.toThrow();
  });
});
