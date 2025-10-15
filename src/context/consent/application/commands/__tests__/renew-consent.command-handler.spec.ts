import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisher } from '@nestjs/cqrs';
import { RenewConsentCommandHandler } from '../renew-consent.command-handler';
import { RenewConsentCommand } from '../renew-consent.command';
import { CONSENT_REPOSITORY } from '../../../domain/consent.repository';
import { ok, err, okVoid } from '../../../../shared/domain/result';
import {
  ConsentError,
  ConsentNotFoundError,
} from '../../../domain/errors/consent.error';
import { Uuid } from '../../../../shared/domain/value-objects/uuid';

describe('RenewConsentCommandHandler', () => {
  let handler: RenewConsentCommandHandler;
  let mockConsentRepository: jest.Mocked<any>;
  let mockEventPublisher: jest.Mocked<EventPublisher>;

  beforeEach(async () => {
    mockConsentRepository = {
      findActiveConsentByType: jest.fn(),
      save: jest.fn(),
    };

    mockEventPublisher = {
      mergeObjectContext: jest.fn().mockReturnValue({
        commit: jest.fn(),
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RenewConsentCommandHandler,
        {
          provide: CONSENT_REPOSITORY,
          useValue: mockConsentRepository,
        },
        {
          provide: EventPublisher,
          useValue: mockEventPublisher,
        },
      ],
    }).compile();

    handler = module.get<RenewConsentCommandHandler>(
      RenewConsentCommandHandler,
    );
  });

  describe('execute', () => {
    const visitorId = Uuid.random().value;
    const newExpiresAt = new Date('2026-12-31T23:59:59.999Z');

    const validCommand = new RenewConsentCommand(
      visitorId,
      'privacy_policy',
      newExpiresAt,
    );

    it('debe renovar exitosamente un consentimiento activo', async () => {
      // Given
      const mockConsent = {
        renew: jest.fn().mockReturnValue('renewed-consent'),
      };
      const mockConsentCtx = { commit: jest.fn() };

      mockConsentRepository.findActiveConsentByType.mockResolvedValue(
        ok(mockConsent),
      );
      mockConsentRepository.save.mockResolvedValue(okVoid());
      mockEventPublisher.mergeObjectContext.mockReturnValue(
        mockConsentCtx as any,
      );

      // When
      const result = await handler.execute(validCommand);

      // Then
      expect(result.isOk()).toBe(true);
      expect(mockConsent.renew).toHaveBeenCalledWith(newExpiresAt);
      expect(mockConsentRepository.save).toHaveBeenCalledWith(mockConsentCtx);
      expect(mockEventPublisher.mergeObjectContext).toHaveBeenCalledWith(
        'renewed-consent',
      );
    });

    it('debe retornar error si el consentimiento no existe', async () => {
      // Given
      mockConsentRepository.findActiveConsentByType.mockResolvedValue(ok(null));

      // When
      const result = await handler.execute(validCommand);

      // Then
      expect(result.isErr()).toBe(true);
      result.fold(
        (error) => {
          expect(error).toBeInstanceOf(ConsentNotFoundError);
          expect(error.message).toContain('No se encontró');
        },
        () => {
          throw new Error('Se esperaba un error, pero el resultado fue Ok');
        },
      );
    });

    it('debe retornar error si el repositorio falla al buscar', async () => {
      // Given
      mockConsentRepository.findActiveConsentByType.mockResolvedValue(
        err(new ConsentError('Error de búsqueda')),
      );

      // When
      const result = await handler.execute(validCommand);

      // Then
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Error de búsqueda');
      }
    });

    it('debe retornar error si el consentimiento no puede renovarse', async () => {
      // Given
      const mockConsent = {
        renew: jest.fn().mockImplementation(() => {
          throw new Error('No se puede renovar un consentimiento revocado');
        }),
      };

      mockConsentRepository.findActiveConsentByType.mockResolvedValue(
        ok(mockConsent),
      );

      // When
      const result = await handler.execute(validCommand);

      // Then
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('No se puede renovar');
      }
    });

    it('debe retornar error si falla al guardar el consentimiento renovado', async () => {
      // Given
      const mockConsent = {
        renew: jest.fn().mockReturnValue('renewed-consent'),
      };

      mockConsentRepository.findActiveConsentByType.mockResolvedValue(
        ok(mockConsent),
      );
      mockConsentRepository.save.mockResolvedValue(
        err(new ConsentError('Error de persistencia')),
      );

      // When
      const result = await handler.execute(validCommand);

      // Then
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Error de persistencia');
      }
    });

    it('debe manejar errores inesperados', async () => {
      // Given
      mockConsentRepository.findActiveConsentByType.mockRejectedValue(
        new Error('Error inesperado'),
      );

      // When
      const result = await handler.execute(validCommand);

      // Then
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Error inesperado');
      }
    });

    it('debe llamar commit() para despachar eventos', async () => {
      // Given
      const mockConsent = {
        renew: jest.fn().mockReturnValue('renewed-consent'),
      };
      const mockCommit = jest.fn();

      mockConsentRepository.findActiveConsentByType.mockResolvedValue(
        ok(mockConsent),
      );
      mockConsentRepository.save.mockResolvedValue(okVoid());
      mockEventPublisher.mergeObjectContext.mockReturnValue({
        commit: mockCommit,
      } as any);

      // When
      await handler.execute(validCommand);

      // Then
      expect(mockCommit).toHaveBeenCalled();
    });
  });
});
