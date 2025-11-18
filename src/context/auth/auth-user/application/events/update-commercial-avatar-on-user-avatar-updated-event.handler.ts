import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { UserAvatarUpdatedEvent } from '../../domain/events/user-avatar-updated-event';
import {
  CommercialRepository,
  COMMERCIAL_REPOSITORY,
} from 'src/context/commercial/domain/commercial.repository';
import { CommercialId } from 'src/context/commercial/domain/value-objects/commercial-id';

/**
 * Handler que sincroniza el avatarUrl de UserAccount a Commercial (MongoDB)
 * Escucha UserAvatarUpdatedEvent y actualiza el documento Commercial correspondiente
 */
@EventsHandler(UserAvatarUpdatedEvent)
export class UpdateCommercialAvatarOnUserAvatarUpdatedEventHandler
  implements IEventHandler<UserAvatarUpdatedEvent>
{
  private readonly logger = new Logger(
    UpdateCommercialAvatarOnUserAvatarUpdatedEventHandler.name,
  );

  constructor(
    @Inject(COMMERCIAL_REPOSITORY)
    private readonly commercialRepository: CommercialRepository,
  ) {}

  async handle(event: UserAvatarUpdatedEvent): Promise<void> {
    const { userId, avatarUrl } = event;

    this.logger.log(
      `Sincronizando avatar de usuario ${userId} a Commercial: ${avatarUrl}`,
    );

    try {
      // Buscar el Commercial por ID (mismo ID que UserAccount)
      const commercialId = CommercialId.create(userId);
      const result = await this.commercialRepository.findById(commercialId);

      if (result.isErr()) {
        this.logger.error(
          `Error al buscar Commercial ${userId}: ${result.error.message}`,
        );
        return;
      }

      const commercial = result.unwrap();

      if (!commercial) {
        this.logger.warn(
          `No se encontró Commercial con ID ${userId}. El usuario puede no ser un comercial o aún no se ha creado el documento Commercial.`,
        );
        return;
      }

      // Actualizar el avatar del Commercial
      const updatedCommercial = commercial.updateAvatar(avatarUrl);

      // Guardar los cambios
      const updateResult =
        await this.commercialRepository.update(updatedCommercial);

      if (updateResult.isErr()) {
        this.logger.error(
          `Error al actualizar avatar de Commercial ${userId}: ${updateResult.error.message}`,
        );
        return;
      }

      this.logger.log(
        `Avatar sincronizado exitosamente para Commercial ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error inesperado al sincronizar avatar de Commercial ${userId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
