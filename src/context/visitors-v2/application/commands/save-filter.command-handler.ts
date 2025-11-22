import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { SaveFilterCommand } from './save-filter.command';
import {
  SAVED_FILTER_REPOSITORY,
  SavedFilterRepository,
} from '../../domain/saved-filter.repository';
import { SavedFilter } from '../../domain/entities/saved-filter.aggregate';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import {
  SavedFilterLimitExceededError,
  SavedFilterPersistenceError,
} from '../../domain/errors/saved-filter.error';

/**
 * Límite máximo de filtros guardados por usuario
 */
const MAX_SAVED_FILTERS_PER_USER = 20;

@CommandHandler(SaveFilterCommand)
export class SaveFilterCommandHandler
  implements ICommandHandler<SaveFilterCommand>
{
  private readonly logger = new Logger(SaveFilterCommandHandler.name);

  constructor(
    @Inject(SAVED_FILTER_REPOSITORY)
    private readonly savedFilterRepository: SavedFilterRepository,
  ) {}

  async execute(
    command: SaveFilterCommand,
  ): Promise<Result<string, DomainError>> {
    this.logger.debug(
      `Guardando filtro "${command.name}" para usuario ${command.userId}`,
    );

    try {
      const userId = new Uuid(command.userId);
      const tenantId = new Uuid(command.tenantId);

      // Verificar límite de filtros por usuario
      const countResult = await this.savedFilterRepository.countByUser(
        userId,
        tenantId,
      );

      if (countResult.isErr()) {
        return err(countResult.error);
      }

      if (countResult.unwrap() >= MAX_SAVED_FILTERS_PER_USER) {
        return err(
          new SavedFilterLimitExceededError(MAX_SAVED_FILTERS_PER_USER),
        );
      }

      // Crear el filtro guardado
      const savedFilter = SavedFilter.create({
        userId,
        tenantId,
        name: command.name,
        description: command.description,
        filters: command.filters as unknown as Record<string, unknown>,
        sort: command.sort as unknown as Record<string, unknown>,
      });

      // Persistir
      const saveResult = await this.savedFilterRepository.save(savedFilter);

      if (saveResult.isErr()) {
        return err(saveResult.error);
      }

      this.logger.debug(`Filtro guardado con ID ${savedFilter.getId().value}`);

      return ok(savedFilter.getId().value);
    } catch (error) {
      const errorMessage = `Error al guardar filtro: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new SavedFilterPersistenceError(errorMessage));
    }
  }
}
