/**
 * Evento de dominio que indica que se ha actualizado el nombre de un participante en un chat
 */
export class ParticipantNameUpdatedEvent {
  constructor(
    public readonly payload: {
      chatId: string;
      participantId: string;
      oldName: string;
      newName: string;
    },
  ) {}
}
