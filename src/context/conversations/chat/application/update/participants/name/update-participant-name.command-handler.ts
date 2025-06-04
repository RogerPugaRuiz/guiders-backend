import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { UpdateParticipantNameCommand } from './update-participant-name.command';
import {
  IChatRepository,
  CHAT_REPOSITORY,
} from '../../../../domain/chat/chat.repository';

/**
 * Manejador del comando para actualizar el nombre de un participante en todos los chats donde participa
 */
@CommandHandler(UpdateParticipantNameCommand)
export class UpdateParticipantNameCommandHandler
  implements ICommandHandler<UpdateParticipantNameCommand>
{
  private readonly logger = new Logger(
    UpdateParticipantNameCommandHandler.name,
  );

  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: IChatRepository,
  ) {}

  /**
   * Ejecuta la actualización del nombre del participante en todos los chats
   * @param command Comando con el ID del participante y el nuevo nombre
   */
  async execute(command: UpdateParticipantNameCommand): Promise<void> {
    this.logger.log(
      `Actualizando nombre de participante ${command.participantId} a: ${command.newName}`,
    );

    try {
      // Buscamos todos los chats donde participa el usuario
      // Nota: Aquí usamos un criterio básico. En una implementación real,
      // necesitarías filtrar por participantes específicos
      const result = await this.chatRepository.findAll();
      const chatsWithParticipant = result.chats.filter((chat) =>
        chat.hasParticipant(command.participantId),
      );

      this.logger.log(
        `Encontrados ${chatsWithParticipant.length} chats donde participa el usuario`,
      );

      // Actualizamos el nombre en cada chat y guardamos
      for (const chat of chatsWithParticipant) {
        const updatedChat = chat.updateParticipantName(
          command.participantId,
          command.newName,
        );
        await this.chatRepository.save(updatedChat);
      }

      this.logger.log(
        `Nombre del participante ${command.participantId} actualizado correctamente en ${chatsWithParticipant.length} chats`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `Error al actualizar nombre del participante ${command.participantId}: ${errorMessage}`,
      );
      throw error;
    }
  }
}
