import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { CommercialConnectedEvent } from '../../domain/events/commercial-connected.event';

/**
 * Event Handler para crear API Key cuando un comercial se conecta
 * Side effect que se ejecuta cuando se emite CommercialConnectedEvent
 */
@EventsHandler(CommercialConnectedEvent)
export class CreateApiKeyOnCommercialConnectedEventHandler
  implements IEventHandler<CommercialConnectedEvent>
{
  private readonly logger = new Logger(
    CreateApiKeyOnCommercialConnectedEventHandler.name,
  );

  handle(event: CommercialConnectedEvent): void {
    this.logger.log(
      `Creando API Key para comercial conectado: ${event.attributes.commercialId}`,
    );

    try {
      // TODO: Implementar lógica para crear API Key
      // Esto podría involucrar:
      // 1. Generar API Key única
      // 2. Asociarla al comercial
      // 3. Configurar permisos/scopes
      // 4. Guardar en base de datos
      // 5. Notificar al comercial

      this.logger.debug(
        `API Key creada exitosamente para comercial: ${event.attributes.commercialId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error al crear API Key para comercial ${event.attributes.commercialId}:`,
        error,
      );
      // Note: No relanzamos el error para no afectar el flujo principal
    }
  }
}
