import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateInviteCommand } from './create-invite.command';
import { Inject } from '@nestjs/common';
import {
  INVITE_REPOSITORY,
  InviteRepository,
} from '../../domain/invite.repository';
import { Invite } from '../../domain/invite.aggregate';
import { InviteId } from '../../domain/value-objects/invite-id';
import { UserId } from '../../domain/value-objects/user-id';
import { InviteEmail } from '../../domain/value-objects/invite-email';
import { InviteToken } from '../../domain/value-objects/invite-token';
import { InviteExpiration } from '../../domain/value-objects/invite-expiration';

// Handler para el comando CreateInviteCommand
@CommandHandler(CreateInviteCommand)
export class CreateInviteCommandHandler
  implements ICommandHandler<CreateInviteCommand>
{
  constructor(
    @Inject(INVITE_REPOSITORY)
    private readonly inviteRepository: InviteRepository,
  ) {}

  // Ejecuta la lógica de creación de la invitación
  async execute(command: CreateInviteCommand): Promise<void> {
    // Crea la entidad Invite usando los value objects
    const invite = Invite.create({
      id: new InviteId(command.inviteId),
      userId: new UserId(command.userId),
      email: new InviteEmail(command.email),
      token: new InviteToken(command.token),
      expiresAt: new InviteExpiration(command.expiresAt),
    });
    // Persiste la invitación
    const result = await this.inviteRepository.save(invite);
    if (result.isErr()) {
      throw new Error(
        'Error al guardar la invitación: ' + result.error.message,
      );
    }
    // Aquí se podría disparar lógica adicional, como enviar email, etc.
  }
}
