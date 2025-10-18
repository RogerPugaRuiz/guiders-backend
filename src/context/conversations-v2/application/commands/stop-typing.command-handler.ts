import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { StopTypingCommand } from './stop-typing.command';
import { Inject, Logger } from '@nestjs/common';
import {
  COMMERCIAL_CONNECTION_DOMAIN_SERVICE,
  CommercialConnectionDomainService,
} from '../../../commercial/domain/commercial-connection.domain-service';
import {
  VISITOR_CONNECTION_DOMAIN_SERVICE,
  VisitorConnectionDomainService,
} from '../../../visitors-v2/domain/visitor-connection.domain-service';
import { CommercialId } from '../../../commercial/domain/value-objects/commercial-id';
import { VisitorId } from '../../../visitors-v2/domain/value-objects/visitor-id';
import { TypingStoppedEvent } from '../../domain/events/typing-stopped.event';

/**
 * Handler para el comando de detener indicador de escritura
 */
@CommandHandler(StopTypingCommand)
export class StopTypingCommandHandler
  implements ICommandHandler<StopTypingCommand, void>
{
  private readonly logger = new Logger(StopTypingCommandHandler.name);

  constructor(
    @Inject(COMMERCIAL_CONNECTION_DOMAIN_SERVICE)
    private readonly commercialConnectionService: CommercialConnectionDomainService,
    @Inject(VISITOR_CONNECTION_DOMAIN_SERVICE)
    private readonly visitorConnectionService: VisitorConnectionDomainService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: StopTypingCommand): Promise<void> {
    this.logger.debug(
      `Usuario ${command.userId} (${command.userType}) dejó de escribir en chat ${command.chatId}`,
    );

    try {
      if (command.userType === 'commercial') {
        const commercialId = new CommercialId(command.userId);
        await this.commercialConnectionService.clearTyping(
          commercialId,
          command.chatId,
        );
      } else {
        const visitorId = new VisitorId(command.userId);
        await this.visitorConnectionService.clearTyping(
          visitorId,
          command.chatId,
        );
      }

      // Emitir evento de dominio para notificar vía WebSocket
      this.eventBus.publish(
        new TypingStoppedEvent(
          command.chatId,
          command.userId,
          command.userType,
        ),
      );
    } catch (error) {
      this.logger.error(
        `Error al limpiar typing status: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
