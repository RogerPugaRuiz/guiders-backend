import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import {
  CHAT_REPOSITORY,
  IChatRepository,
} from 'src/context/conversations/chat/domain/chat/chat.repository';
import { CriteriaBuilder } from 'src/context/shared/domain/criteria-builder';
import { Chat } from 'src/context/conversations/chat/domain/chat/chat';
import { Operator } from 'src/context/shared/domain/criteria';
import { ParticipantViewingChatCommand } from './participant-viewing-chat.command';

/**
 * Manejador para actualizar el estado de visualización de un participante en un chat
 */
@CommandHandler(ParticipantViewingChatCommand)
export class ParticipantViewingChatCommandHandler
  implements ICommandHandler<ParticipantViewingChatCommand>
{
  private readonly criteriaBuilder = new CriteriaBuilder<Chat>();
  private readonly logger = new Logger(
    ParticipantViewingChatCommandHandler.name,
  );

  constructor(
    @Inject(CHAT_REPOSITORY) private readonly chatRepository: IChatRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: ParticipantViewingChatCommand): Promise<void> {
    const { chatId, participantId, isViewing, viewingAt } = command.params;

    this.logger.log(
      `Actualizando estado de visualización del participante ${participantId} en el chat ${chatId} a: ${isViewing}`,
    );

    const criteria = this.criteriaBuilder
      .addFilter('id', Operator.EQUALS, chatId)
      .build();

    const optionalChat = await this.chatRepository.findOne(criteria);

    await optionalChat.fold(
      () => {
        this.logger.error(`Chat ${chatId} no encontrado`);
        throw new Error('Chat not found');
      },
      async ({ chat }) => {
        try {
          // Actualizamos el estado de visualización
          const newChat = chat.setParticipantViewing(participantId, isViewing);

          // Si está viendo, también actualizamos el lastSeenAt
          if (isViewing) {
            newChat.participantSeenAt(participantId, viewingAt);
          }

          await this.chatRepository.save(newChat);
          const chatWithEvents = this.publisher.mergeObjectContext(newChat);
          chatWithEvents.commit();

          this.logger.log(
            `Estado de visualización del participante ${participantId} actualizado correctamente`,
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Error desconocido';
          this.logger.error(
            `Error al actualizar estado de visualización: ${errorMessage}`,
          );
          throw error;
        }
      },
    );

    return Promise.resolve();
  }
}
