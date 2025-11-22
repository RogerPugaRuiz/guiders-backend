import { Test, TestingModule } from '@nestjs/testing';
import { SaveFilterCommandHandler } from '../save-filter.command-handler';
import { SaveFilterCommand } from '../save-filter.command';
import {
  SavedFilterRepository,
  SAVED_FILTER_REPOSITORY,
} from '../../../domain/saved-filter.repository';
import { ok, err } from '../../../../shared/domain/result';
import { Uuid } from '../../../../shared/domain/value-objects/uuid';
import {
  SavedFilterLimitExceededError,
  SavedFilterPersistenceError,
} from '../../../domain/errors/saved-filter.error';
import { VisitorLifecycleFilter } from '../../dtos/visitor-filters.dto';

describe('SaveFilterCommandHandler', () => {
  let handler: SaveFilterCommandHandler;
  let savedFilterRepository: jest.Mocked<SavedFilterRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SaveFilterCommandHandler,
        {
          provide: SAVED_FILTER_REPOSITORY,
          useValue: {
            countByUser: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<SaveFilterCommandHandler>(SaveFilterCommandHandler);
    savedFilterRepository = module.get(SAVED_FILTER_REPOSITORY);
  });

  describe('execute', () => {
    const userId = Uuid.random().value;
    const tenantId = Uuid.random().value;
    const validCommand = new SaveFilterCommand(
      userId,
      tenantId,
      'Mi filtro',
      'Descripción del filtro',
      { lifecycle: [VisitorLifecycleFilter.LEAD] },
      undefined,
    );

    it('should save filter successfully when under limit', async () => {
      savedFilterRepository.countByUser.mockResolvedValue(ok(5));
      savedFilterRepository.save.mockResolvedValue(ok(undefined));

      const result = await handler.execute(validCommand);

      expect(result.isOk()).toBe(true);
      expect(savedFilterRepository.countByUser).toHaveBeenCalled();
      expect(savedFilterRepository.save).toHaveBeenCalled();
    });

    it('should return error when limit is reached', async () => {
      savedFilterRepository.countByUser.mockResolvedValue(ok(20));

      const result = await handler.execute(validCommand);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(SavedFilterLimitExceededError);
      }
      expect(savedFilterRepository.save).not.toHaveBeenCalled();
    });

    it('should return error when countByUser fails', async () => {
      savedFilterRepository.countByUser.mockResolvedValue(
        err(new SavedFilterPersistenceError('Error de conexión')),
      );

      const result = await handler.execute(validCommand);

      expect(result.isErr()).toBe(true);
    });

    it('should return error when save fails', async () => {
      savedFilterRepository.countByUser.mockResolvedValue(ok(0));
      savedFilterRepository.save.mockResolvedValue(
        err(new SavedFilterPersistenceError('Error al guardar')),
      );

      const result = await handler.execute(validCommand);

      expect(result.isErr()).toBe(true);
    });

    it('should create filter with correct data', async () => {
      savedFilterRepository.countByUser.mockResolvedValue(ok(0));
      savedFilterRepository.save.mockResolvedValue(ok(undefined));

      await handler.execute(validCommand);

      expect(savedFilterRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Mi filtro',
        }),
      );
    });
  });
});
