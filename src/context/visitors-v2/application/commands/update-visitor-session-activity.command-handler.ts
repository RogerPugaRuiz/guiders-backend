import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { UpdateVisitorSessionActivityCommand } from './update-visitor-session-activity.command';
import {
  VISITOR_V2_REPOSITORY,
  VisitorV2Repository,
} from '../../domain/visitor-v2.repository';
import { VisitorId } from '../../domain/value-objects/visitor-id';
import { Result, ok, err } from '../../../shared/domain/result';
import { VisitorV2PersistenceError } from '../../infrastructure/persistence/impl/visitor-v2-mongo.repository.impl';
import { DomainError } from 'src/context/shared/domain/domain.error';

/**
 * Handler para actualizar la actividad de la sesión activa del visitante
 * Esto mantiene la sesión viva y evita que sea cerrada por el SessionCleanupScheduler
 */
@CommandHandler(UpdateVisitorSessionActivityCommand)
export class UpdateVisitorSessionActivityCommandHandler
  implements ICommandHandler<UpdateVisitorSessionActivityCommand>
{
  private readonly logger = new Logger(
    UpdateVisitorSessionActivityCommandHandler.name,
  );

  constructor(
    @Inject(VISITOR_V2_REPOSITORY)
    private readonly visitorRepository: VisitorV2Repository,
  ) {}

  async execute(
    command: UpdateVisitorSessionActivityCommand,
  ): Promise<Result<void, DomainError>> {
    try {
      const visitorId = new VisitorId(command.visitorId);

      // Buscar visitante
      const visitorResult = await this.visitorRepository.findById(visitorId);

      if (visitorResult.isErr()) {
        this.logger.warn(
          `Visitante no encontrado para actualizar actividad: ${command.visitorId}`,
        );
        return err(visitorResult.error);
      }

      const visitor = visitorResult.unwrap();

      // Actualizar actividad de la sesión activa
      visitor.updateSessionActivity();

      // Guardar cambios
      const saveResult = await this.visitorRepository.update(visitor);

      if (saveResult.isErr()) {
        this.logger.error(
          `Error guardando actividad de sesión: ${saveResult.error.message}`,
        );
        return err(saveResult.error);
      }

      this.logger.debug(
        `✅ Actividad de sesión actualizada para visitante ${command.visitorId}`,
      );

      return ok(undefined);
    } catch (error) {
      this.logger.error(
        `Error actualizando actividad de sesión: ${(error as Error).message}`,
      );
      return err(
        new VisitorV2PersistenceError(
          `Error actualizando actividad de sesión: ${(error as Error).message}`,
        ),
      );
    }
  }
}
