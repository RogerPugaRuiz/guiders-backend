import { ICommand } from '@nestjs/cqrs';

// Comando para crear una invitación (Invite)
// Recibe los datos necesarios para crear el invite
export class CreateInviteCommand implements ICommand {
  // El DTO debe contener los datos mínimos para crear la invitación
  constructor(
    public readonly inviteId: string, // UUID generado
    public readonly userId: string, // UUID del usuario invitado
    public readonly email: string, // Email del usuario invitado
    public readonly token: string, // Token de invitación
    public readonly expiresAt: string, // Fecha de expiración ISO
  ) {}
}
