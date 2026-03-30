import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { VisitorV2MongoRepositoryImpl } from '../visitor-v2-mongo.repository.impl';
import { VisitorV2 } from '../../../../domain/visitor-v2.aggregate';
import { VisitorId } from '../../../../domain/value-objects/visitor-id';
import { TenantId } from '../../../../domain/value-objects/tenant-id';
import { SiteId } from '../../../../domain/value-objects/site-id';
import { VisitorFingerprint } from '../../../../domain/value-objects/visitor-fingerprint';
import { VisitorLifecycle } from '../../../../domain/value-objects/visitor-lifecycle';
import { SessionId } from '../../../../domain/value-objects/session-id';

describe('VisitorV2MongoRepositoryImpl - Session Preservation', () => {
  let repository: VisitorV2MongoRepositoryImpl;
  let mockModel: any;

  beforeEach(async () => {
    const mockModelInstance = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisitorV2MongoRepositoryImpl,
        {
          provide: getModelToken('VisitorV2MongoEntity'),
          useValue: mockModelInstance,
        },
      ],
    }).compile();

    repository = module.get<VisitorV2MongoRepositoryImpl>(
      VisitorV2MongoRepositoryImpl,
    );
    mockModel = module.get(getModelToken('VisitorV2MongoEntity'));
  });

  describe('save method - session preservation', () => {
    it('debería preservar sesiones existentes al agregar nuevas sesiones', async () => {
      // Arrange
      const visitorId = VisitorId.random();
      const tenantId = TenantId.random();
      const siteId = SiteId.random();
      const fingerprint = new VisitorFingerprint('fingerprint-123');

      // Crear visitante con sesión existente
      const existingSessionId = SessionId.random();
      const existingSession = {
        id: existingSessionId.getValue(),
        startedAt: new Date('2023-01-01T10:00:00Z'),
        lastActivityAt: new Date('2023-01-01T10:05:00Z'),
        endedAt: null,
      };

      // Datos que simulan lo que está en MongoDB actualmente
      const existingMongoDoc = {
        id: visitorId.getValue(),
        tenantId: tenantId.getValue(),
        siteId: siteId.getValue(),
        fingerprint: fingerprint.getValue(),
        lifecycle: VisitorLifecycle.ANON,
        isInternal: false,
        createdAt: new Date('2023-01-01T10:00:00Z'),
        updatedAt: new Date('2023-01-01T10:00:00Z'),
        sessions: [existingSession],
      };

      // Configurar mock para encontrar el visitante existente
      mockModel.findOne.mockResolvedValue(existingMongoDoc);

      // Crear visitante con nueva sesión para guardar
      const newSessionId = SessionId.random();
      const visitor = VisitorV2.fromPrimitives({
        id: visitorId.getValue(),
        tenantId: tenantId.getValue(),
        siteId: siteId.getValue(),
        fingerprint: fingerprint.getValue(),
        lifecycle: VisitorLifecycle.ANON,
        isInternal: false,
        hasAcceptedPrivacyPolicy: true,
        privacyPolicyAcceptedAt: '2023-01-01T10:00:00Z',
        consentVersion: 'v1.0',
        createdAt: '2023-01-01T10:00:00Z',
        updatedAt: '2023-01-01T10:10:00Z',
        sessions: [
          {
            id: newSessionId.getValue(),
            startedAt: '2023-01-01T10:10:00Z',
            lastActivityAt: '2023-01-01T10:10:00Z',
            endedAt: undefined,
          },
        ],
      });

      // Configurar mock para actualización exitosa
      mockModel.findOneAndUpdate.mockResolvedValue({});

      // Act
      const result = await repository.save(visitor);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockModel.findOne).toHaveBeenCalledWith({
        id: visitorId.getValue(),
      });

      // Verificar que findOneAndUpdate fue llamado con sesiones preservadas
      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { id: visitorId.getValue() },
        expect.objectContaining({
          sessions: expect.arrayContaining([
            // Sesión existente preservada
            existingSession,
            // Nueva sesión agregada
            expect.objectContaining({
              id: newSessionId.getValue(),
            }),
          ]),
        }),
        { new: true },
      );

      // Verificar que el array de sesiones tiene exactamente 2 elementos
      const updateCall = mockModel.findOneAndUpdate.mock.calls[0];
      const updateData = updateCall[1];
      expect(updateData.sessions).toHaveLength(2);
    });

    it('debería actualizar sesión existente si ya existe el mismo ID', async () => {
      // Arrange
      const visitorId = VisitorId.random();
      const sessionId = SessionId.random();

      const existingSession = {
        id: sessionId.getValue(),
        startedAt: new Date('2023-01-01T10:00:00Z'),
        lastActivityAt: new Date('2023-01-01T10:05:00Z'),
        endedAt: null,
      };

      const existingMongoDoc = {
        id: visitorId.getValue(),
        tenantId: TenantId.random().getValue(),
        siteId: SiteId.random().getValue(),
        fingerprint: 'fingerprint-123',
        lifecycle: VisitorLifecycle.ANON,
        isInternal: false,
        createdAt: new Date('2023-01-01T10:00:00Z'),
        updatedAt: new Date('2023-01-01T10:00:00Z'),
        sessions: [existingSession],
      };

      mockModel.findOne.mockResolvedValue(existingMongoDoc);

      // Visitor con sesión actualizada (nuevo lastActivityAt)
      const visitor = VisitorV2.fromPrimitives({
        id: visitorId.getValue(),
        tenantId: existingMongoDoc.tenantId,
        siteId: existingMongoDoc.siteId,
        fingerprint: existingMongoDoc.fingerprint,
        lifecycle: VisitorLifecycle.ANON,
        isInternal: false,
        hasAcceptedPrivacyPolicy: true,
        privacyPolicyAcceptedAt: '2023-01-01T10:00:00Z',
        consentVersion: 'v1.0',
        createdAt: '2023-01-01T10:00:00Z',
        updatedAt: '2023-01-01T10:15:00Z',
        sessions: [
          {
            id: sessionId.getValue(),
            startedAt: '2023-01-01T10:00:00Z',
            lastActivityAt: '2023-01-01T10:15:00Z', // Actualizado
            endedAt: undefined,
          },
        ],
      });

      mockModel.findOneAndUpdate.mockResolvedValue({});

      // Act
      const result = await repository.save(visitor);

      // Assert
      expect(result.isOk()).toBe(true);

      const updateCall = mockModel.findOneAndUpdate.mock.calls[0];
      const updateData = updateCall[1];

      // Solo debe haber una sesión (la actualizada)
      expect(updateData.sessions).toHaveLength(1);
      expect(updateData.sessions[0].id).toBe(sessionId.getValue());
      expect(updateData.sessions[0].lastActivityAt).toEqual(
        new Date('2023-01-01T10:15:00Z'),
      );
    });

    it('debería crear nuevo visitante si no existe', async () => {
      // Arrange
      const visitorId = VisitorId.random();

      // No existe el visitante
      mockModel.findOne.mockResolvedValue(null);

      const visitor = VisitorV2.fromPrimitives({
        id: visitorId.getValue(),
        tenantId: TenantId.random().getValue(),
        siteId: SiteId.random().getValue(),
        fingerprint: 'fingerprint-new',
        lifecycle: VisitorLifecycle.ANON,
        isInternal: false,
        hasAcceptedPrivacyPolicy: true,
        privacyPolicyAcceptedAt: '2023-01-01T10:00:00Z',
        consentVersion: 'v1.0',
        createdAt: '2023-01-01T10:00:00Z',
        updatedAt: '2023-01-01T10:00:00Z',
        sessions: [
          {
            id: SessionId.random().getValue(),
            startedAt: '2023-01-01T10:00:00Z',
            lastActivityAt: '2023-01-01T10:00:00Z',
            endedAt: undefined,
          },
        ],
      });

      mockModel.findOneAndUpdate.mockResolvedValue({});

      // Act
      const result = await repository.save(visitor);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { id: visitorId.getValue() },
        expect.any(Object),
        { upsert: true, new: true },
      );
    });
  });
});
