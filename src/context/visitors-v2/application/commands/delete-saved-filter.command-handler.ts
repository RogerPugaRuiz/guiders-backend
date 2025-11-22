import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { DeleteSavedFilterCommand } from './delete-saved-filter.command';
import {
  SAVED_FILTER_REPOSITORY,
  SavedFilterRepository,
} from '../../domain/saved-filter.repository';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import { Result, err, okVoid } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import {
  SavedFilterNotFoundError,
  SavedFilterAccessDeniedError,
  SavedFilterPersistenceError,
} from '../../domain/errors/saved-filter.error';

@CommandHandler(DeleteSavedFilterCommand)
export class DeleteSavedFilterCommandHandler
  implements ICommandHandler<DeleteSavedFilterCommand>
{
  private readonly logger = new Logger(DeleteSavedFilterCommandHandler.name);

  constructor(
    @Inject(SAVED_FILTER_REPOSITORY)
    private readonly savedFilterRepository: SavedFilterRepository,
  ) {}

  async execute(
    command: DeleteSavedFilterCommand,
  ): Promise<Result<void, DomainError>> {
    this.logger.debug(`Eliminando filtro ${command.filterId}`);

    try {
      const filterId = new Uuid(command.filterId);

      // Verificar que el filtro existe y pertenece al usuario
      const filterResult = await this.savedFilterRepository.findById(filterId);

      if (filterResult.isErr()) {
        return err(filterResult.error);
      }

      const filter = filterResult.unwrap();

      if (!filter) {
        return err(new SavedFilterNotFoundError());
      }

      // Verificar pertenencia al usuario y tenant
      if (
        filter.getUserId().value !== command.userId ||
        filter.getTenantId().value !== command.tenantId
      ) {
        return err(new SavedFilterAccessDeniedError());
      }

      // Eliminar
      const deleteResult = await this.savedFilterRepository.delete(filterId);

      if (deleteResult.isErr()) {
        return err(deleteResult.error);
      }

      this.logger.debug(`Filtro ${command.filterId} eliminado`);

      return okVoid();
    } catch (error) {
      const errorMessage = `Error al eliminar filtro: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new SavedFilterPersistenceError(errorMessage));
    }
  }
}
