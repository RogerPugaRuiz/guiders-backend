// Handler para el comando AcceptInviteCommand
// Aplica CQRS y DDD usando @nestjs/cqrs

import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { AcceptInviteCommand } from './accept-invite.command';
import { Inject } from '@nestjs/common';
import {
  InviteRepository,
  INVITE_REPOSITORY,
} from '../../domain/invite.repository';
import {
  UserAccountRepository,
  USER_ACCOUNT_REPOSITORY,
} from '../../domain/user-account.repository';
import { InviteToken } from '../../domain/value-objects/invite-token';
import { Criteria, Operator, Filter } from 'src/context/shared/domain/criteria';
import { Invite } from '../../domain/invite';
import {
  USER_PASSWORD_HASHER,
  UserPasswordHasher,
} from '../service/user-password-hasher';

// Handler que gestiona la lógica de aceptar una invitación y establecer contraseña
@CommandHandler(AcceptInviteCommand)
export class AcceptInviteCommandHandler
  implements ICommandHandler<AcceptInviteCommand>
{
  // Inyecta dependencias necesarias en el constructor
  constructor(
    @Inject(INVITE_REPOSITORY)
    private readonly inviteRepository: InviteRepository,
    @Inject(USER_ACCOUNT_REPOSITORY)
    private readonly userRepository: UserAccountRepository,
    @Inject(USER_PASSWORD_HASHER)
    private readonly hasherService: UserPasswordHasher,
    private readonly publisher: EventPublisher,
  ) {}

  // Ejecuta la lógica de aceptación de invitación
  async execute(command: AcceptInviteCommand): Promise<void> {
    // 1. Validar el token de invitación
    const token = new InviteToken(command.token);
    const criteria = new Criteria<Invite>([
      new Filter<Invite>('token', Operator.EQUALS, token.value),
    ]);
    const inviteResult = await this.inviteRepository.match(criteria);
    if (inviteResult.isErr() || !inviteResult.value.length) {
      throw new Error('Invitación no encontrada o token inválido');
    }
    const invite = inviteResult.value[0];

    // 2. Verificar que la invitación no haya expirado
    const now = new Date();
    if (new Date(invite.expiresAt.value) < now) {
      throw new Error('La invitación ha expirado');
    }

    // 3. Establecer la nueva contraseña en el usuario
    const userId = invite.userId.value;
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('Usuario no encontrado para la invitación');
    }
    // Integra el contexto de eventos al usuario (AggregateRoot)
    const userWithContext = this.publisher.mergeObjectContext(user);
    // Actualiza el usuario con la nueva contraseña
    const hashedPassword = await this.hasherService.hash(command.password);
    userWithContext.updatePassword(hashedPassword);
    await this.userRepository.save(userWithContext);
    // Publica los eventos de dominio generados
    userWithContext.commit();
    // Aquí podrías actualizar el estado de la invitación si aplica
  }
}
