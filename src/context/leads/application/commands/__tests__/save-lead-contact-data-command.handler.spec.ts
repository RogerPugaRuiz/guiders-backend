import { Test, TestingModule } from '@nestjs/testing';
import { SaveLeadContactDataCommandHandler } from '../save-lead-contact-data-command.handler';
import { SaveLeadContactDataCommand } from '../save-lead-contact-data.command';
import {
  ILeadContactDataRepository,
  LEAD_CONTACT_DATA_REPOSITORY,
} from '../../../domain/lead-contact-data.repository';
import {
  VisitorV2Repository,
  VISITOR_V2_REPOSITORY,
} from 'src/context/visitors-v2/domain/visitor-v2.repository';
import { ok, err } from 'src/context/shared/domain/result';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import { EventPublisher } from '@nestjs/cqrs';
import { VisitorNotFoundError } from '../../../domain/errors/leads.error';

describe('SaveLeadContactDataCommandHandler', () => {
  let handler: SaveLeadContactDataCommandHandler;
  let repository: jest.Mocked<ILeadContactDataRepository>;
  let visitorRepository: jest.Mocked<VisitorV2Repository>;
  let _eventPublisher: jest.Mocked<EventPublisher>;

  beforeEach(async () => {
    const mockEventPublisher = {
      mergeObjectContext: jest.fn().mockReturnValue({
        commit: jest.fn(),
        convertToLead: jest.fn(),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SaveLeadContactDataCommandHandler,
        {
          provide: LEAD_CONTACT_DATA_REPOSITORY,
          useValue: {
            exists: jest.fn(),
            save: jest.fn(),
            findByVisitorId: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: VISITOR_V2_REPOSITORY,
          useValue: {
            findById: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: EventPublisher,
          useValue: mockEventPublisher,
        },
      ],
    }).compile();

    handler = module.get<SaveLeadContactDataCommandHandler>(
      SaveLeadContactDataCommandHandler,
    );
    repository = module.get(LEAD_CONTACT_DATA_REPOSITORY);
    visitorRepository = module.get(VISITOR_V2_REPOSITORY);
    _eventPublisher = module.get(EventPublisher);
  });

  describe('execute', () => {
    const visitorId = Uuid.random().value;
    const companyId = Uuid.random().value;

    it('debe retornar VisitorNotFoundError si el visitor no existe', async () => {
      visitorRepository.findById.mockResolvedValue(
        err({ message: 'Not found' } as any),
      );

      const command = new SaveLeadContactDataCommand({
        visitorId,
        companyId,
        nombre: 'Roger',
        email: 'roger@example.com',
      });

      const result = await handler.execute(command);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(VisitorNotFoundError);
      }
    });

    it('debe crear nuevos datos de contacto y retornar isNew=true', async () => {
      // Mock visitor existe
      visitorRepository.findById.mockResolvedValue(ok({} as any));

      // Mock lead no existe
      repository.exists.mockResolvedValue(ok(false));

      // Mock save
      repository.save.mockResolvedValue(ok(undefined));

      const command = new SaveLeadContactDataCommand({
        visitorId,
        companyId,
        nombre: 'Roger',
        apellidos: 'Puga Ruiz',
        email: 'roger@example.com',
        telefono: '+34609252646',
        poblacion: 'MOLINS DE REI',
      });

      const result = await handler.execute(command);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const data = result.unwrap();
        expect(data.isNew).toBe(true);
        expect(data.id).toBeDefined();
        expect(repository.save).toHaveBeenCalled();
      }
    });

    it('debe actualizar datos existentes y retornar isNew=false', async () => {
      const existingId = Uuid.random().value;
      const existingData = {
        id: existingId,
        visitorId,
        companyId,
        nombre: 'Juan',
        apellidos: 'García',
        email: 'juan@example.com',
        telefono: '+34612345678',
        poblacion: 'Madrid',
        additionalData: {},
        extractedAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock visitor existe
      visitorRepository.findById.mockResolvedValue(ok({} as any));

      // Mock lead existe
      repository.exists.mockResolvedValue(ok(true));

      // Mock findByVisitorId retorna datos existentes
      repository.findByVisitorId.mockResolvedValue(ok(existingData));

      // Mock update
      repository.update.mockResolvedValue(ok(undefined));

      const command = new SaveLeadContactDataCommand({
        visitorId,
        companyId,
        nombre: 'Roger', // Nuevo nombre
        email: 'roger@example.com', // Nuevo email
      });

      const result = await handler.execute(command);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const data = result.unwrap();
        expect(data.isNew).toBe(false);
        expect(data.id).toBe(existingId);
        expect(repository.update).toHaveBeenCalled();

        // Verificar que se hizo merge parcial
        const updateCall = repository.update.mock.calls[0][0];
        expect(updateCall.nombre).toBe('Roger'); // Actualizado
        expect(updateCall.apellidos).toBe('García'); // Mantiene existente
        expect(updateCall.email).toBe('roger@example.com'); // Actualizado
        expect(updateCall.poblacion).toBe('Madrid'); // Mantiene existente
      }
    });

    it('debe mantener valores existentes cuando los nuevos son undefined', async () => {
      const existingId = Uuid.random().value;
      const existingData = {
        id: existingId,
        visitorId,
        companyId,
        nombre: 'Juan',
        apellidos: 'García',
        email: 'juan@example.com',
        telefono: '+34612345678',
        poblacion: 'Madrid',
        additionalData: {},
        extractedAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock visitor existe
      visitorRepository.findById.mockResolvedValue(ok({} as any));

      // Mock lead existe
      repository.exists.mockResolvedValue(ok(true));

      // Mock findByVisitorId
      repository.findByVisitorId.mockResolvedValue(ok(existingData));

      // Mock update
      repository.update.mockResolvedValue(ok(undefined));

      const command = new SaveLeadContactDataCommand({
        visitorId,
        companyId,
        // Solo enviar algunos campos
        nombre: 'Roger',
        // email, apellidos, telefono, poblacion no se envían
      });

      const result = await handler.execute(command);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updateCall = repository.update.mock.calls[0][0];
        // Los campos no enviados deben mantener sus valores existentes
        expect(updateCall.nombre).toBe('Roger');
        expect(updateCall.apellidos).toBe('García'); // No cambió
        expect(updateCall.email).toBe('juan@example.com'); // No cambió
        expect(updateCall.telefono).toBe('+34612345678'); // No cambió
      }
    });

    it('debe manejar errores de persistencia', async () => {
      visitorRepository.findById.mockResolvedValue(ok({} as any));
      repository.exists.mockResolvedValue(ok(false));
      repository.save.mockResolvedValue(
        err({ message: 'Database error' } as any),
      );

      const command = new SaveLeadContactDataCommand({
        visitorId,
        companyId,
        nombre: 'Roger',
      });

      const result = await handler.execute(command);

      expect(result.isErr()).toBe(true);
    });

    it('debe retornar isNew=true incluso si solo se envían datos mínimos', async () => {
      visitorRepository.findById.mockResolvedValue(ok({} as any));
      repository.exists.mockResolvedValue(ok(false));
      repository.save.mockResolvedValue(ok(undefined));

      const command = new SaveLeadContactDataCommand({
        visitorId,
        companyId,
        // Sin campos opcionales
      });

      const result = await handler.execute(command);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.unwrap().isNew).toBe(true);
      }
    });
  });
});
