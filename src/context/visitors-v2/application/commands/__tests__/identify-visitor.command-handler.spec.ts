import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisher } from '@nestjs/cqrs';
import { IdentifyVisitorCommandHandler } from '../identify-visitor.command-handler';
import { IdentifyVisitorCommand } from '../identify-visitor.command';
import {
  VisitorV2Repository,
  VISITOR_V2_REPOSITORY,
} from '../../../domain/visitor-v2.repository';
import { VisitorV2 } from '../../../domain/visitor-v2.aggregate';
import { VisitorId } from '../../../domain/value-objects/visitor-id';
import { TenantId } from '../../../domain/value-objects/tenant-id';
import { SiteId } from '../../../domain/value-objects/site-id';
import { VisitorFingerprint } from '../../../domain/value-objects/visitor-fingerprint';
import {
  VisitorLifecycleVO,
  VisitorLifecycle,
} from '../../../domain/value-objects/visitor-lifecycle';
import { ok, err, okVoid } from '../../../../shared/domain/result';
import { IdentifyVisitorResponseDto } from '../../dtos/identify-visitor-response.dto';
import { VisitorV2PersistenceError } from '../../../infrastructure/persistence/impl/visitor-v2-mongo.repository.impl';

describe('IdentifyVisitorCommandHandler', () => {
  let handler: IdentifyVisitorCommandHandler;
  let visitorRepository: VisitorV2Repository;
  let eventPublisher: EventPublisher;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdentifyVisitorCommandHandler,
        {
          provide: VISITOR_V2_REPOSITORY,
          useValue: {
            findByFingerprintAndSite: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: EventPublisher,
          useValue: {
            mergeObjectContext: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<IdentifyVisitorCommandHandler>(
      IdentifyVisitorCommandHandler,
    );
    visitorRepository = module.get<VisitorV2Repository>(VISITOR_V2_REPOSITORY);
    eventPublisher = module.get<EventPublisher>(EventPublisher);
  });

  describe('execute', () => {
    const validCommand = new IdentifyVisitorCommand(
      'fp_abc123def456',
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440000',
      'https://landing.mytech.com/home',
    );

    it('debe crear un nuevo visitante anónimo cuando no existe', async () => {
      // Arrange
      const mockVisitorContext = {
        commit: jest.fn(),
        startNewSession: jest.fn(),
        getId: jest.fn().mockReturnValue(VisitorId.random()),
        getLifecycle: jest
          .fn()
          .mockReturnValue(new VisitorLifecycleVO(VisitorLifecycle.ANON)),
        getActiveSessions: jest.fn().mockReturnValue([
          {
            getId: jest.fn().mockReturnValue({ value: 'session-123' }),
          },
        ]),
        toPrimitives: jest.fn().mockReturnValue({
          id: 'visitor-123',
          tenantId: validCommand.tenantId,
          siteId: validCommand.siteId,
          fingerprint: validCommand.fingerprint,
          lifecycle: 'ANON',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sessions: [
            {
              id: 'session-123',
              startedAt: new Date().toISOString(),
              lastActivityAt: new Date().toISOString(),
            },
          ],
        }),
      };

      jest
        .spyOn(visitorRepository, 'findByFingerprintAndSite')
        .mockResolvedValue(
          err(new VisitorV2PersistenceError('Visitante no encontrado')),
        );

      jest
        .spyOn(eventPublisher, 'mergeObjectContext')
        .mockReturnValue(mockVisitorContext as any);

      jest.spyOn(visitorRepository, 'save').mockResolvedValue(okVoid());

      // Act
      const result = await handler.execute(validCommand);

      // Assert
      expect(result).toBeInstanceOf(IdentifyVisitorResponseDto);
      expect(result.isNewVisitor).toBe(true);
      expect(result.lifecycle).toBe('anon');
      expect(result.visitorId).toBeDefined();
      expect(result.sessionId).toBeDefined();
      expect(visitorRepository.findByFingerprintAndSite).toHaveBeenCalledWith(
        expect.any(VisitorFingerprint),
        expect.any(SiteId),
      );
      expect(eventPublisher.mergeObjectContext).toHaveBeenCalled();
      expect(visitorRepository.save).toHaveBeenCalled();
      expect(mockVisitorContext.commit).toHaveBeenCalled();
    });

    it('debe actualizar visitante existente y crear nueva sesión', async () => {
      // Arrange
      const existingVisitorId = VisitorId.random();
      const existingVisitor = VisitorV2.create({
        id: existingVisitorId,
        tenantId: new TenantId(validCommand.tenantId),
        siteId: new SiteId(validCommand.siteId),
        fingerprint: new VisitorFingerprint(validCommand.fingerprint),
        lifecycle: new VisitorLifecycleVO(VisitorLifecycle.ENGAGED),
      });

      // Spy en el método startNewSession del visitor real
      const startNewSessionSpy = jest.spyOn(existingVisitor, 'startNewSession');

      const mockVisitorContext = {
        commit: jest.fn(),
        getId: jest.fn().mockReturnValue(existingVisitorId),
        getLifecycle: jest
          .fn()
          .mockReturnValue(new VisitorLifecycleVO(VisitorLifecycle.ENGAGED)),
        getActiveSessions: jest.fn().mockReturnValue([
          {
            getId: jest.fn().mockReturnValue({ value: 'session-456' }),
          },
        ]),
      };

      jest
        .spyOn(visitorRepository, 'findByFingerprintAndSite')
        .mockResolvedValue(ok(existingVisitor));

      jest
        .spyOn(eventPublisher, 'mergeObjectContext')
        .mockReturnValue(mockVisitorContext as any);

      jest.spyOn(visitorRepository, 'save').mockResolvedValue(okVoid());

      // Act
      const result = await handler.execute(validCommand);

      // Assert
      expect(result).toBeInstanceOf(IdentifyVisitorResponseDto);
      expect(result.isNewVisitor).toBe(false);
      expect(result.lifecycle).toBe('engaged');
      expect(result.visitorId).toBe(existingVisitorId.value);
      expect(result.sessionId).toBeDefined(); // Verificar que existe sessionId
      expect(visitorRepository.findByFingerprintAndSite).toHaveBeenCalled();
      expect(startNewSessionSpy).toHaveBeenCalled(); // Verificar que se llamó en el visitor real
      expect(mockVisitorContext.commit).toHaveBeenCalled();
    });

    it('debe lanzar error cuando falla el guardado', async () => {
      // Arrange
      const mockVisitorContext = {
        commit: jest.fn(),
        startNewSession: jest.fn(),
        getId: jest.fn().mockReturnValue(VisitorId.random()),
        getLifecycle: jest
          .fn()
          .mockReturnValue(new VisitorLifecycleVO(VisitorLifecycle.ANON)),
        getActiveSessions: jest.fn().mockReturnValue([
          {
            getId: jest.fn().mockReturnValue({ value: 'session-123' }),
          },
        ]),
      };

      jest
        .spyOn(visitorRepository, 'findByFingerprintAndSite')
        .mockResolvedValue(
          err(new VisitorV2PersistenceError('Visitante no encontrado')),
        );

      jest
        .spyOn(eventPublisher, 'mergeObjectContext')
        .mockReturnValue(mockVisitorContext as any);

      jest
        .spyOn(visitorRepository, 'save')
        .mockResolvedValue(
          err(new VisitorV2PersistenceError('Error de base de datos')),
        );

      // Act & Assert
      await expect(handler.execute(validCommand)).rejects.toThrow(
        'Error al guardar visitante',
      );
      expect(mockVisitorContext.commit).not.toHaveBeenCalled();
    });

    it('debe manejar errores inesperados correctamente', async () => {
      // Arrange
      jest
        .spyOn(visitorRepository, 'findByFingerprintAndSite')
        .mockRejectedValue(new Error('Error de conexión'));

      // Act & Assert
      await expect(handler.execute(validCommand)).rejects.toThrow(
        'Error de conexión',
      );
    });
  });
});
