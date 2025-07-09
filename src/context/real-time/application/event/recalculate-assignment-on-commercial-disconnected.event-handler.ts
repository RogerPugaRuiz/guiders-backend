import { Inject, Logger } from '@nestjs/common';
import {
  EventBus,
  EventsHandler,
  IEventHandler,
  CommandBus,
} from '@nestjs/cqrs';
import { CommercialDisconnectedEvent } from '../../domain/events/commercial-disconnected.event';
import { ChatCommercialsUnassignedEvent } from '../../domain/events/chat-commercials-unassigned.event';
import { CommercialAssignmentService } from '../../domain/commercial-assignment.service';
import {
  CHAT_REPOSITORY,
  IChatRepository,
} from 'src/context/conversations/chat/domain/chat/chat.repository';
import {
  COMERCIAL_CLAIM_REPOSITORY,
  IComercialClaimRepository,
} from 'src/context/conversations/chat/domain/claim/comercial-claim.repository';
import { ReleaseChatClaimCommand } from 'src/context/conversations/chat/application/commands/release-chat-claim/release-chat-claim.command';
import { ComercialId } from 'src/context/conversations/chat/domain/claim/value-objects/comercial-id';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';
import { Chat } from 'src/context/conversations/chat/domain/chat/chat';
import { ConnectionRole } from '../../domain/value-objects/connection-role';

/**
 * Event handler que maneja la desconexión de comerciales
 * Cuando un comercial se desconecta, este handler:
 * 1. Verifica que el usuario desconectado sea comercial
 * 2. Busca todos los chats pendientes donde está asignado
 * 3. Publica eventos para remover el comercial de esos chats
 */
@EventsHandler(CommercialDisconnectedEvent)
export class RecalculateAssignmentOnCommercialDisconnectedEventHandler
  implements IEventHandler<CommercialDisconnectedEvent>
{
  private readonly logger = new Logger(
    RecalculateAssignmentOnCommercialDisconnectedEventHandler.name,
  );

  constructor(
    private readonly commercialAssignmentService: CommercialAssignmentService,
    private readonly eventBus: EventBus,
    private readonly commandBus: CommandBus,
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: IChatRepository,
    @Inject(COMERCIAL_CLAIM_REPOSITORY)
    private readonly comercialClaimRepository: IComercialClaimRepository,
  ) {}

  /**
   * Maneja el evento CommercialDisconnectedEvent recalculando la asignación de chats
   * @param event Evento disparado cuando un comercial se desconecta
   */
  async handle(event: CommercialDisconnectedEvent): Promise<void> {
    // Verificamos que el usuario desconectado tenga el rol de comercial
    const isCommercial = event.connection.roles.includes(
      ConnectionRole.COMMERCIAL,
    );

    if (!isCommercial) {
      this.logger.debug(
        `Usuario ${event.connection.userId} desconectado no es comercial, ignorando`,
      );
      return;
    }

    this.logger.log(
      `Comercial ${event.connection.userId} desconectado, recalculando asignación de chats`,
    );

    // NUEVA FUNCIONALIDAD: Liberar claims activos del comercial desconectado
    await this.releaseActiveClaimsForCommercial(event.connection.userId);

    // Buscamos todos los chats donde está asignado este comercial y que tengan status 'pending'
    // El filtro de participantes ahora funciona correctamente con la implementación de MongoDB
    const chatsCriteria = new Criteria<Chat>()
      .addFilter('participants', Operator.EQUALS, event.connection.userId)
      .addFilter('status', Operator.EQUALS, 'pending');

    const { chats } = await this.chatRepository.find(chatsCriteria);

    if (chats.length === 0) {
      this.logger.debug(
        `Comercial ${event.connection.userId} no está asignado a ningún chat pendiente`,
      );
      return;
    }

    // Para cada chat donde está asignado, verificamos que realmente esté asignado
    // y luego publicamos el evento de desasignación
    for (const chat of chats) {
      // Verificación adicional para asegurar que el comercial está asignado
      if (!chat.hasParticipant(event.connection.userId)) {
        this.logger.debug(
          `Comercial ${event.connection.userId} no está asignado al chat ${chat.id.value}, omitiendo`,
        );
        continue;
      }

      this.eventBus.publish(
        new ChatCommercialsUnassignedEvent(chat.id.value, [
          event.connection.userId,
        ]),
      );

      this.logger.log(
        `Comercial ${event.connection.userId} removido del chat ${chat.id.value}`,
      );
    }

    this.logger.log(
      `Procesada desconexión del comercial ${event.connection.userId}: ${chats.length} chats actualizados`,
    );
  }

  /**
   * Libera automáticamente todos los claims activos de un comercial que se desconecta
   * @param comercialUserId ID del usuario comercial
   */
  private async releaseActiveClaimsForCommercial(
    comercialUserId: string,
  ): Promise<void> {
    try {
      this.logger.log(
        `Liberando claims activos del comercial ${comercialUserId}`,
      );

      const activeClaimsResult =
        await this.comercialClaimRepository.findActiveClaimsByComercial(
          new ComercialId(comercialUserId),
        );

      if (activeClaimsResult.isErr()) {
        this.logger.error(
          `Error al buscar claims activos del comercial ${comercialUserId}: ${activeClaimsResult.error.message}`,
        );
        return;
      }

      const activeClaims = activeClaimsResult.value;

      if (activeClaims.length === 0) {
        this.logger.debug(
          `Comercial ${comercialUserId} no tiene claims activos`,
        );
        return;
      }

      // Liberar cada claim activo usando el comando
      for (const claim of activeClaims) {
        try {
          await this.commandBus.execute(
            new ReleaseChatClaimCommand(claim.chatId.value, comercialUserId),
          );

          this.logger.log(
            `Claim liberado automáticamente: Chat ${claim.chatId.value} - Comercial ${comercialUserId}`,
          );
        } catch (error) {
          this.logger.error(
            `Error al liberar claim del chat ${claim.chatId.value}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      this.logger.log(
        `Liberados ${activeClaims.length} claims del comercial ${comercialUserId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error inesperado al liberar claims del comercial ${comercialUserId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
