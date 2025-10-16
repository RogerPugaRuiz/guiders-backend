import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisher } from '@nestjs/cqrs';
import { RecordConsentCommandHandler } from '../record-consent.command-handler';
import { RecordConsentCommand } from '../record-consent.command';
import {
  ConsentRepository,
  CONSENT_REPOSITORY,
} from '../../../domain/consent.repository';
import { VisitorConsent } from '../../../domain/visitor-consent.aggregate';
import { ConsentType } from '../../../domain/value-objects/consent-type';
import { ConsentVersion } from '../../../domain/value-objects/consent-version';
import { VisitorId } from '../../../../visitors-v2/domain/value-objects/visitor-id';
import { ok, okVoid } from '../../../../shared/domain/result';
import { Uuid } from '../../../../shared/domain/value-objects/uuid';

describe('RecordConsentCommandHandler - Idempotencia', () => {
  let handler: RecordConsentCommandHandler;
  let mockRepository: jest.Mocked<ConsentRepository>;
  let mockPublisher: jest.Mocked<EventPublisher>;

  beforeEach(async () => {
    mockRepository = {
      save: jest.fn(),
      findByVisitorId: jest.fn(),
      findActiveConsentByType: jest.fn(),
      hasActiveConsent: jest.fn(),
      findExpiredConsents: jest.fn(),
      findExpiringConsents: jest.fn(),
    } as jest.Mocked<ConsentRepository>;

    mockPublisher = {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      mergeObjectContext: jest.fn((obj) => ({
        ...obj,
        commit: jest.fn(),
      })),
    } as unknown as jest.Mocked<EventPublisher>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecordConsentCommandHandler,
        { provide: CONSENT_REPOSITORY, useValue: mockRepository },
        { provide: EventPublisher, useValue: mockPublisher },
      ],
    }).compile();

    handler = module.get<RecordConsentCommandHandler>(
      RecordConsentCommandHandler,
    );
  });

  describe('Escenario 1: Primer consentimiento (no existe previo)', () => {
    it('debe crear nuevo consentimiento cuando no existe uno previo', async () => {
      // Arrange
      const visitorId = Uuid.random().value;
      const command = new RecordConsentCommand(
        visitorId,
        'privacy_policy',
        'v1.4.3',
        '127.0.0.1',
        'Mozilla/5.0',
        { fingerprint: '123456' },
      );

      // No existe consentimiento previo
      mockRepository.findActiveConsentByType.mockResolvedValue(ok(null));
      mockRepository.save.mockResolvedValue(okVoid());

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockRepository.findActiveConsentByType).toHaveBeenCalledTimes(1);
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('Escenario 2: Consentimiento duplicado (misma versión)', () => {
    it('debe retornar ID existente sin crear duplicado', async () => {
      // Arrange
      const visitorId = Uuid.random().value;
      const existingConsentId = Uuid.random().value;

      const command = new RecordConsentCommand(
        visitorId,
        'privacy_policy',
        'v1.4.3',
        '127.0.0.1',
        'Mozilla/5.0',
        { fingerprint: '123456' },
      );

      // Simular consentimiento existente con misma versión
      const existingConsent = VisitorConsent.grant({
        visitorId,
        consentType: new ConsentType('privacy_policy'),
        version: ConsentVersion.fromString('v1.4.3'),
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        metadata: { fingerprint: '123456' },
      });

      // Mockear el ID del consentimiento existente
      Object.defineProperty(existingConsent, 'id', {
        get: () => ({ value: existingConsentId }),
      });

      mockRepository.findActiveConsentByType.mockResolvedValue(
        ok(existingConsent),
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(existingConsentId); // Retorna ID existente
      expect(mockRepository.findActiveConsentByType).toHaveBeenCalledTimes(1);
      expect(mockRepository.save).not.toHaveBeenCalled(); // NO debe guardar
    });
  });

  describe('Escenario 3: Cambio de versión de política', () => {
    it('debe crear nuevo consentimiento cuando cambia la versión', async () => {
      // Arrange
      const visitorId = Uuid.random().value;
      const existingConsentId = Uuid.random().value;

      const command = new RecordConsentCommand(
        visitorId,
        'privacy_policy',
        'v1.5.0', // Nueva versión
        '127.0.0.1',
        'Mozilla/5.0',
        { fingerprint: '123456' },
      );

      // Simular consentimiento existente con versión antigua
      const existingConsent = VisitorConsent.grant({
        visitorId,
        consentType: new ConsentType('privacy_policy'),
        version: ConsentVersion.fromString('v1.4.3'), // Versión antigua
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        metadata: { fingerprint: '123456' },
      });

      Object.defineProperty(existingConsent, 'id', {
        get: () => ({ value: existingConsentId }),
      });

      mockRepository.findActiveConsentByType.mockResolvedValue(
        ok(existingConsent),
      );
      mockRepository.save.mockResolvedValue(okVoid());

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).not.toBe(existingConsentId); // Nuevo ID
      expect(mockRepository.findActiveConsentByType).toHaveBeenCalledTimes(1);
      expect(mockRepository.save).toHaveBeenCalledTimes(1); // SÍ debe guardar nuevo
    });
  });

  describe('Escenario 4: Múltiples llamadas idénticas (caso real del bug)', () => {
    it('debe retornar mismo ID en llamadas consecutivas con mismos datos', async () => {
      // Arrange
      const visitorId = Uuid.random().value;
      const command = new RecordConsentCommand(
        visitorId,
        'privacy_policy',
        'v1.4.3',
        '188.79.74.239',
        'Mozilla/5.0',
        { fingerprint: '768321607', domain: 'autopractik.es' },
      );

      // Primera llamada: no existe
      mockRepository.findActiveConsentByType.mockResolvedValueOnce(ok(null));
      mockRepository.save.mockResolvedValue(okVoid());

      // Primera ejecución
      const result1 = await handler.execute(command);
      expect(result1.isOk()).toBe(true);
      const firstConsentId = result1.unwrap();

      // Simular que ahora ya existe (para segunda llamada)
      const existingConsent = VisitorConsent.grant({
        visitorId,
        consentType: new ConsentType('privacy_policy'),
        version: ConsentVersion.fromString('v1.4.3'),
        ipAddress: '188.79.74.239',
        userAgent: 'Mozilla/5.0',
        metadata: { fingerprint: '768321607', domain: 'autopractik.es' },
      });

      Object.defineProperty(existingConsent, 'id', {
        get: () => ({ value: firstConsentId }),
      });

      mockRepository.findActiveConsentByType.mockResolvedValue(
        ok(existingConsent),
      );

      // Segunda ejecución (simula refresh de página)
      const result2 = await handler.execute(command);
      expect(result2.isOk()).toBe(true);
      expect(result2.unwrap()).toBe(firstConsentId); // Mismo ID

      // Tercera ejecución (simula otra reconexión)
      const result3 = await handler.execute(command);
      expect(result3.isOk()).toBe(true);
      expect(result3.unwrap()).toBe(firstConsentId); // Mismo ID

      // Verificaciones
      expect(mockRepository.save).toHaveBeenCalledTimes(1); // Solo guarda una vez
    });
  });

  describe('Validación de llamadas al repositorio', () => {
    it('debe llamar findActiveConsentByType con parámetros correctos', async () => {
      // Arrange
      const visitorId = Uuid.random().value;
      const command = new RecordConsentCommand(
        visitorId,
        'marketing',
        'v1.4.0', // Versión válida >= v1.4.0
        '127.0.0.1',
        'Mozilla/5.0',
        {},
      );

      mockRepository.findActiveConsentByType.mockResolvedValue(ok(null));
      mockRepository.save.mockResolvedValue(okVoid());

      // Act
      await handler.execute(command);

      // Assert
      const callArgs = mockRepository.findActiveConsentByType.mock.calls[0];
      expect(callArgs[0]).toBeInstanceOf(VisitorId);
      expect(callArgs[0].getValue()).toBe(visitorId);
      expect(callArgs[1]).toBeInstanceOf(ConsentType);
      expect(callArgs[1].value).toBe('marketing');
    });
  });
});
