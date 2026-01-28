import { Test } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { SaveLeadContactDataCommandHandler } from '../save-lead-contact-data-command.handler';
import { SaveLeadContactDataCommand } from '../save-lead-contact-data.command';
import {
  ILeadContactDataRepository,
  LEAD_CONTACT_DATA_REPOSITORY,
} from '../../../domain/lead-contact-data.repository';
import { ok, okVoid, err } from 'src/context/shared/domain/result';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import { LeadsPersistenceError } from '../../../domain/errors/leads.error';

describe('SaveLeadContactDataCommandHandler', () => {
  let handler: SaveLeadContactDataCommandHandler;
  let repository: jest.Mocked<ILeadContactDataRepository>;
  let eventBus: jest.Mocked<EventBus>;

  const companyId = Uuid.random().value;
  const visitorId = Uuid.random().value;

  beforeEach(async () => {
    repository = {
      save: jest.fn(),
      findByVisitorId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByEmail: jest.fn(),
      exists: jest.fn(),
      findByChatId: jest.fn(),
      findById: jest.fn(),
      findByCompanyId: jest.fn(),
    };

    eventBus = {
      publish: jest.fn(),
    } as any;

    const module = await Test.createTestingModule({
      providers: [
        SaveLeadContactDataCommandHandler,
        {
          provide: LEAD_CONTACT_DATA_REPOSITORY,
          useValue: repository,
        },
        {
          provide: EventBus,
          useValue: eventBus,
        },
      ],
    }).compile();

    handler = module.get<SaveLeadContactDataCommandHandler>(
      SaveLeadContactDataCommandHandler,
    );
  });

  describe('execute', () => {
    it('debe crear nuevos datos de contacto cuando no existen', async () => {
      repository.findByVisitorId.mockResolvedValue(ok(null));
      repository.save.mockResolvedValue(okVoid());

      const command = new SaveLeadContactDataCommand({
        visitorId,
        companyId,
        nombre: 'Juan',
        email: 'juan@test.com',
      });

      const result = await handler.execute(command);

      expect(result.isOk()).toBe(true);
      expect(repository.save).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalled();
    });

    it('debe actualizar datos existentes haciendo merge parcial', async () => {
      const existingId = Uuid.random().value;
      repository.findByVisitorId.mockResolvedValue(
        ok({
          id: existingId,
          visitorId,
          companyId,
          nombre: 'Juan',
          email: 'juan@test.com',
          extractedAt: new Date(),
        }),
      );
      repository.update.mockResolvedValue(okVoid());

      const command = new SaveLeadContactDataCommand({
        visitorId,
        companyId,
        telefono: '612345678',
      });

      const result = await handler.execute(command);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(existingId);
      expect(repository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: 'Juan',
          email: 'juan@test.com',
          telefono: '612345678',
        }),
      );
    });

    it('debe preservar datos existentes cuando los nuevos son undefined', async () => {
      const existingId = Uuid.random().value;
      repository.findByVisitorId.mockResolvedValue(
        ok({
          id: existingId,
          visitorId,
          companyId,
          nombre: 'Juan',
          apellidos: 'Garcia',
          email: 'juan@test.com',
          extractedAt: new Date(),
        }),
      );
      repository.update.mockResolvedValue(okVoid());

      const command = new SaveLeadContactDataCommand({
        visitorId,
        companyId,
        nombre: 'Pedro',
        // apellidos no se pasa, debe mantenerse
      });

      const result = await handler.execute(command);

      expect(result.isOk()).toBe(true);
      expect(repository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: 'Pedro',
          apellidos: 'Garcia',
        }),
      );
    });

    it('debe retornar error si falla la busqueda', async () => {
      repository.findByVisitorId.mockResolvedValue(
        err(new LeadsPersistenceError('DB error')),
      );

      const command = new SaveLeadContactDataCommand({
        visitorId,
        companyId,
        nombre: 'Juan',
      });

      const result = await handler.execute(command);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('DB error');
      }
    });

    it('debe retornar error si falla el guardado', async () => {
      repository.findByVisitorId.mockResolvedValue(ok(null));
      repository.save.mockResolvedValue(
        err(new LeadsPersistenceError('Save failed')),
      );

      const command = new SaveLeadContactDataCommand({
        visitorId,
        companyId,
        nombre: 'Juan',
      });

      const result = await handler.execute(command);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Save failed');
      }
    });

    it('debe retornar error si falla la actualizacion', async () => {
      repository.findByVisitorId.mockResolvedValue(
        ok({
          id: Uuid.random().value,
          visitorId,
          companyId,
          nombre: 'Juan',
          extractedAt: new Date(),
        }),
      );
      repository.update.mockResolvedValue(
        err(new LeadsPersistenceError('Update failed')),
      );

      const command = new SaveLeadContactDataCommand({
        visitorId,
        companyId,
        telefono: '612345678',
      });

      const result = await handler.execute(command);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Update failed');
      }
    });
  });
});
