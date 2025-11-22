import { Test, TestingModule } from '@nestjs/testing';
import { DeleteSavedFilterCommandHandler } from '../delete-saved-filter.command-handler';
import { DeleteSavedFilterCommand } from '../delete-saved-filter.command';
import {
  SavedFilterRepository,
  SAVED_FILTER_REPOSITORY,
} from '../../../domain/saved-filter.repository';
import { ok, err } from '../../../../shared/domain/result';
import { Uuid } from '../../../../shared/domain/value-objects/uuid';
import { SavedFilter } from '../../../domain/entities/saved-filter.aggregate';
import {
  SavedFilterNotFoundError,
  SavedFilterAccessDeniedError,
  SavedFilterPersistenceError,
} from '../../../domain/errors/saved-filter.error';

describe('DeleteSavedFilterCommandHandler', () => {
  let handler: DeleteSavedFilterCommandHandler;
  let savedFilterRepository: jest.Mocked<SavedFilterRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteSavedFilterCommandHandler,
        {
          provide: SAVED_FILTER_REPOSITORY,
          useValue: {
            findById: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<DeleteSavedFilterCommandHandler>(
      DeleteSavedFilterCommandHandler,
    );
    savedFilterRepository = module.get(SAVED_FILTER_REPOSITORY);
  });

  describe('execute', () => {
    const userId = Uuid.random().value;
    const tenantId = Uuid.random().value;
    const filterId = Uuid.random().value;

    const createMockFilter = (ownerId: string, ownerTenantId: string) => {
      return SavedFilter.create({
        userId: new Uuid(ownerId),
        tenantId: new Uuid(ownerTenantId),
        name: 'Test Filter',
        description: 'Test description',
        filters: { lifecycle: ['lead'] },
        sort: { field: 'createdAt', direction: 'DESC' },
      });
    };

    it('should delete filter successfully when owner matches', async () => {
      const filter = createMockFilter(userId, tenantId);
      savedFilterRepository.findById.mockResolvedValue(ok(filter));
      savedFilterRepository.delete.mockResolvedValue(ok(undefined));

      const command = new DeleteSavedFilterCommand(filterId, userId, tenantId);
      const result = await handler.execute(command);

      expect(result.isOk()).toBe(true);
      expect(savedFilterRepository.delete).toHaveBeenCalled();
    });

    it('should return error when filter not found', async () => {
      savedFilterRepository.findById.mockResolvedValue(ok(null));

      const command = new DeleteSavedFilterCommand(filterId, userId, tenantId);
      const result = await handler.execute(command);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(SavedFilterNotFoundError);
      }
    });

    it('should return error when user is not the owner', async () => {
      const differentUserId = Uuid.random().value;
      const filter = createMockFilter(differentUserId, tenantId);
      savedFilterRepository.findById.mockResolvedValue(ok(filter));

      const command = new DeleteSavedFilterCommand(filterId, userId, tenantId);
      const result = await handler.execute(command);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(SavedFilterAccessDeniedError);
      }
      expect(savedFilterRepository.delete).not.toHaveBeenCalled();
    });

    it('should return error when tenant does not match', async () => {
      const differentTenantId = Uuid.random().value;
      const filter = createMockFilter(userId, differentTenantId);
      savedFilterRepository.findById.mockResolvedValue(ok(filter));

      const command = new DeleteSavedFilterCommand(filterId, userId, tenantId);
      const result = await handler.execute(command);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(SavedFilterAccessDeniedError);
      }
    });

    it('should return error when findById fails', async () => {
      savedFilterRepository.findById.mockResolvedValue(
        err(new SavedFilterPersistenceError('Error de conexión')),
      );

      const command = new DeleteSavedFilterCommand(filterId, userId, tenantId);
      const result = await handler.execute(command);

      expect(result.isErr()).toBe(true);
    });

    it('should return error when delete fails', async () => {
      const filter = createMockFilter(userId, tenantId);
      savedFilterRepository.findById.mockResolvedValue(ok(filter));
      savedFilterRepository.delete.mockResolvedValue(
        err(new SavedFilterPersistenceError('Error al eliminar')),
      );

      const command = new DeleteSavedFilterCommand(filterId, userId, tenantId);
      const result = await handler.execute(command);

      expect(result.isErr()).toBe(true);
    });
  });
});
