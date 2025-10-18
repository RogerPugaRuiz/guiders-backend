import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { StartTypingCommand } from './start-typing.command';
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
import { TypingStartedEvent } from '../../domain/events/typing-started.event';

/**
 * Handler para el comando de iniciar indicador de escritura
 */
@CommandHandler(StartTypingCommand)
export class StartTypingCommandHandler
  implements ICommandHandler<StartTypingCommand, void>
{
  private readonly logger = new Logger(StartTypingCommandHandler.name);

  constructor(
    @Inject(COMMERCIAL_CONNECTION_DOMAIN_SERVICE)
    private readonly commercialConnectionService: CommercialConnectionDomainService,
    @Inject(VISITOR_CONNECTION_DOMAIN_SERVICE)
    private readonly visitorConnectionService: VisitorConnectionDomainService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: StartTypingCommand): Promise<void> {
    this.logger.debug(
      `Usuario ${command.userId} (${command.userType}) está escribiendo en chat ${command.chatId}`,
    );

    try {
      if (command.userType === 'commercial') {
        const commercialId = new CommercialId(command.userId);
        await this.commercialConnectionService.setTyping(
          commercialId,
          command.chatId,
        );
      } else {
        const visitorId = new VisitorId(command.userId);
        await this.visitorConnectionService.setTyping(
          visitorId,
          command.chatId,
        );
      }

      // Emitir evento de dominio para notificar vía WebSocket
      this.eventBus.publish(
        new TypingStartedEvent(
          command.chatId,
          command.userId,
          command.userType,
        ),
      );
    } catch (error) {
      this.logger.error(
        `Error al establecer typing status: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
