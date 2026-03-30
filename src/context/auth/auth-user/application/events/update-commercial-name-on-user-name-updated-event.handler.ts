import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { UserNameUpdatedEvent } from '../../domain/events/user-name-updated-event';
import {
  CommercialRepository,
  COMMERCIAL_REPOSITORY,
} from 'src/context/commercial/domain/commercial.repository';
import { CommercialId } from 'src/context/commercial/domain/value-objects/commercial-id';

/**
 * Handler que sincroniza el nombre de UserAccount a Commercial (MongoDB)
 * Escucha UserNameUpdatedEvent y actualiza el documento Commercial correspondiente
 */
@EventsHandler(UserNameUpdatedEvent)
export class UpdateCommercialNameOnUserNameUpdatedEventHandler
  implements IEventHandler<UserNameUpdatedEvent>
{
  private readonly logger = new Logger(
    UpdateCommercialNameOnUserNameUpdatedEventHandler.name,
  );

  constructor(
    @Inject(COMMERCIAL_REPOSITORY)
    private readonly commercialRepository: CommercialRepository,
  ) {}

  async handle(event: UserNameUpdatedEvent): Promise<void> {
    const { userId, keycloakId, name } = event;

    // El Commercial usa keycloakId como ID, no el userId de UserAccount
    if (!keycloakId) {
      this.logger.debug(
        `Usuario ${userId} no tiene keycloakId, omitiendo sincronización de nombre`,
      );
      return;
    }

    this.logger.log(
      `Sincronizando nombre de usuario ${userId} (keycloakId: ${keycloakId}) a Commercial: ${name}`,
    );

    try {
      // Buscar el Commercial por keycloakId (que es el ID del Commercial en MongoDB)
      const commercialId = CommercialId.create(keycloakId);
      const result = await this.commercialRepository.findById(commercialId);

      if (result.isErr()) {
        this.logger.error(
          `Error al buscar Commercial ${keycloakId}: ${result.error.message}`,
        );
        return;
      }

      const commercial = result.unwrap();

      if (!commercial) {
        this.logger.warn(
          `No se encontró Commercial con ID ${keycloakId}. El usuario puede no ser un comercial o aún no se ha creado el documento Commercial.`,
        );
        return;
      }

      // Actualizar el nombre del Commercial
      const updatedCommercial = commercial.updateName(name);

      // Guardar los cambios
      const updateResult =
        await this.commercialRepository.update(updatedCommercial);

      if (updateResult.isErr()) {
        this.logger.error(
          `Error al actualizar nombre de Commercial ${keycloakId}: ${updateResult.error.message}`,
        );
        return;
      }

      this.logger.log(
        `Nombre sincronizado exitosamente para Commercial ${keycloakId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error inesperado al sincronizar nombre de Commercial ${keycloakId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
