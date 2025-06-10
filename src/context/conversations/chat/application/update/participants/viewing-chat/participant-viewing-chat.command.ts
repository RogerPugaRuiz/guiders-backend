import { ICommand } from '@nestjs/cqrs';

/**
 * Comando para actualizar el estado de visualización de un participante en un chat
 */
export class ParticipantViewingChatCommand implements ICommand {
  constructor(
    readonly params: {
      chatId: string;
      participantId: string;
      isViewing: boolean;
      viewingAt: Date;
    },
  ) {}
}
