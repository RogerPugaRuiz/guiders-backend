/**
 * Evento de dominio emitido cuando se actualiza el nombre de un usuario
 * Se usa para sincronizar el nombre con el Commercial en MongoDB
 */
export class UserNameUpdatedEvent {
  constructor(
    public readonly userId: string,
    public readonly keycloakId: string | null,
    public readonly name: string,
    public readonly previousName: string,
  ) {}
}
