import { Test, TestingModule } from '@nestjs/testing';
import { MarkVisitorAsInternalOnCommercialFingerprintRegisteredEventHandler } from './mark-visitor-as-internal-on-fingerprint-registered.handler';
import { CommercialFingerprintRegisteredEvent } from '../../../commercial/domain/events/commercial-fingerprint-registered.event';
import {
  VISITOR_V2_REPOSITORY,
  VisitorV2Repository,
} from '../../domain/visitor-v2.repository';
import { ok, err, okVoid } from '../../../shared/domain/result';
import { VisitorV2 } from '../../domain/visitor-v2.aggregate';
import { VisitorId } from '../../domain/value-objects/visitor-id';
import { TenantId } from '../../domain/value-objects/tenant-id';
import { SiteId } from '../../domain/value-objects/site-id';
import { VisitorFingerprint } from '../../domain/value-objects/visitor-fingerprint';
import { Uuid } from '../../../shared/domain/value-objects/uuid';
import { DomainError } from '../../../shared/domain/domain.error';
import { VisitorV2PersistenceError } from '../../infrastructure/persistence/impl/visitor-v2-mongo.repository.impl';

describe('MarkVisitorAsInternalOnCommercialFingerprintRegisteredEventHandler', () => {
  let handler: MarkVisitorAsInternalOnCommercialFingerprintRegisteredEventHandler;
  let mockRepository: jest.Mocked<VisitorV2Repository>;

  beforeEach(async () => {
    // Mock del repositorio
    mockRepository = {
      findByFingerprint: jest.fn(),
      update: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarkVisitorAsInternalOnCommercialFingerprintRegisteredEventHandler,
        {
          provide: VISITOR_V2_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    handler = module.get<MarkVisitorAsInternalOnCommercialFingerprintRegisteredEventHandler>(
      MarkVisitorAsInternalOnCommercialFingerprintRegisteredEventHandler,
    );
  });

  describe('handle', () => {
    it('debería marcar visitantes como internos cuando se encuentra un match de fingerprint', async () => {
      // Arrange
      const commercialId = Uuid.random().value;
      const fingerprint = 'test-fingerprint-12345';
      const event = new CommercialFingerprintRegisteredEvent(
        commercialId,
        fingerprint,
      );

      // Crear visitante mock que NO es interno
      const visitor = VisitorV2.create({
        id: new VisitorId(Uuid.random().value),
        tenantId: new TenantId(Uuid.random().value),
        siteId: new SiteId(Uuid.random().value),
        fingerprint: new VisitorFingerprint(fingerprint),
        isInternal: false,
      });

      mockRepository.findByFingerprint.mockResolvedValue(ok([visitor]));
      mockRepository.update.mockResolvedValue(okVoid());

      // Act
      await handler.handle(event);

      // Assert
      expect(mockRepository.findByFingerprint).toHaveBeenCalledWith(
        fingerprint,
      );
      expect(mockRepository.update).toHaveBeenCalledTimes(1);

      // Verificar que el visitante actualizado tiene isInternal = true
      const updatedVisitor = mockRepository.update.mock.calls[0][0];
      expect(updatedVisitor.getIsInternal()).toBe(true);
    });

    it('no debería actualizar visitantes que ya son internos', async () => {
      // Arrange
      const commercialId = Uuid.random().value;
      const fingerprint = 'test-fingerprint-12345';
      const event = new CommercialFingerprintRegisteredEvent(
        commercialId,
        fingerprint,
      );

      // Crear visitante mock que YA es interno
      const visitor = VisitorV2.create({
        id: new VisitorId(Uuid.random().value),
        tenantId: new TenantId(Uuid.random().value),
        siteId: new SiteId(Uuid.random().value),
        fingerprint: new VisitorFingerprint(fingerprint),
        isInternal: true,
      });

      mockRepository.findByFingerprint.mockResolvedValue(ok([visitor]));

      // Act
      await handler.handle(event);

      // Assert
      expect(mockRepository.findByFingerprint).toHaveBeenCalledWith(
        fingerprint,
      );
      // No debe llamar a update porque ya es interno
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('debería manejar múltiples visitantes con el mismo fingerprint', async () => {
      // Arrange
      const commercialId = Uuid.random().value;
      const fingerprint = 'test-fingerprint-12345';
      const event = new CommercialFingerprintRegisteredEvent(
        commercialId,
        fingerprint,
      );

      const visitor1 = VisitorV2.create({
        id: new VisitorId(Uuid.random().value),
        tenantId: new TenantId(Uuid.random().value),
        siteId: new SiteId(Uuid.random().value),
        fingerprint: new VisitorFingerprint(fingerprint),
        isInternal: false,
      });

      const visitor2 = VisitorV2.create({
        id: new VisitorId(Uuid.random().value),
        tenantId: new TenantId(Uuid.random().value),
        siteId: new SiteId(Uuid.random().value),
        fingerprint: new VisitorFingerprint(fingerprint),
        isInternal: false,
      });

      mockRepository.findByFingerprint.mockResolvedValue(
        ok([visitor1, visitor2]),
      );
      mockRepository.update.mockResolvedValue(okVoid());

      // Act
      await handler.handle(event);

      // Assert
      expect(mockRepository.findByFingerprint).toHaveBeenCalledWith(
        fingerprint,
      );
      expect(mockRepository.update).toHaveBeenCalledTimes(2);
    });

    it('no debería fallar si no se encuentran visitantes', async () => {
      // Arrange
      const commercialId = Uuid.random().value;
      const fingerprint = 'test-fingerprint-nonexistent';
      const event = new CommercialFingerprintRegisteredEvent(
        commercialId,
        fingerprint,
      );

      mockRepository.findByFingerprint.mockResolvedValue(ok([]));

      // Act & Assert - no debe lanzar error
      await expect(handler.handle(event)).resolves.not.toThrow();
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('debería manejar errores del repositorio gracefully', async () => {
      // Arrange
      const commercialId = Uuid.random().value;
      const fingerprint = 'test-fingerprint-12345';
      const event = new CommercialFingerprintRegisteredEvent(
        commercialId,
        fingerprint,
      );

      mockRepository.findByFingerprint.mockResolvedValue(
        err(new VisitorV2PersistenceError('Database error')),
      );

      // Act & Assert - no debe lanzar error, solo loggear
      await expect(handler.handle(event)).resolves.not.toThrow();
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('debería continuar procesando otros visitantes si uno falla al actualizar', async () => {
      // Arrange
      const commercialId = Uuid.random().value;
      const fingerprint = 'test-fingerprint-12345';
      const event = new CommercialFingerprintRegisteredEvent(
        commercialId,
        fingerprint,
      );

      const visitor1 = VisitorV2.create({
        id: new VisitorId(Uuid.random().value),
        tenantId: new TenantId(Uuid.random().value),
        siteId: new SiteId(Uuid.random().value),
        fingerprint: new VisitorFingerprint(fingerprint),
        isInternal: false,
      });

      const visitor2 = VisitorV2.create({
        id: new VisitorId(Uuid.random().value),
        tenantId: new TenantId(Uuid.random().value),
        siteId: new SiteId(Uuid.random().value),
        fingerprint: new VisitorFingerprint(fingerprint),
        isInternal: false,
      });

      mockRepository.findByFingerprint.mockResolvedValue(
        ok([visitor1, visitor2]),
      );

      // Primer update falla, segundo tiene éxito
      mockRepository.update
        .mockResolvedValueOnce(err(new VisitorV2PersistenceError('Update failed')))
        .mockResolvedValueOnce(okVoid());

      // Act
      await handler.handle(event);

      // Assert
      expect(mockRepository.update).toHaveBeenCalledTimes(2);
    });
  });
});
