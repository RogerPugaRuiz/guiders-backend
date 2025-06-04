/**
 * Comando para actualizar el nombre de un participante en todos los chats donde participa
 */
export class UpdateParticipantNameCommand {
  constructor(
    public readonly participantId: string,
    public readonly newName: string,
  ) {}
}
