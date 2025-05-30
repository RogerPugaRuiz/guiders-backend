// Comando para aceptar una invitación y establecer contraseña
// Cumple CQRS y DDD siguiendo la convención de carpetas y nombres

import { ICommand } from '@nestjs/cqrs';

// Comando para aceptar una invitación
export class AcceptInviteCommand implements ICommand {
  // Token de invitación recibido por email
  readonly token: string;
  // Nueva contraseña elegida por el usuario
  readonly password: string;

  constructor(token: string, password: string) {
    this.token = token;
    this.password = password;
  }
}
