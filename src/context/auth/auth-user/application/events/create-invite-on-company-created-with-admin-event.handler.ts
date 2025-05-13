// Handler para CompanyCreatedWithAdminEvent que crea una invitación (Invite) para el admin
// Ubicación: src/context/auth/auth-user/application/events/create-invite-on-company-created-with-admin-event.handler.ts
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { CompanyCreatedWithAdminEvent } from 'src/context/company/domain/events/company-created-with-admin.event';
import { Inject } from '@nestjs/common';
import { Invite } from '../../domain/invite';
import { InviteId } from '../../domain/value-objects/invite-id';
import { UserId } from '../../domain/value-objects/user-id';
import { InviteEmail } from '../../domain/value-objects/invite-email';
import { InviteToken } from '../../domain/value-objects/invite-token';
import { InviteExpiration } from '../../domain/value-objects/invite-expiration';
import {
  InviteRepository,
  INVITE_REPOSITORY,
} from '../../domain/invite.repository';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';

// Este handler escucha el evento de creación de compañía con admin y crea una invitación para el admin
@EventsHandler(CompanyCreatedWithAdminEvent)
export class CreateInviteOnCompanyCreatedWithAdminEventHandler
  implements IEventHandler<CompanyCreatedWithAdminEvent>
{
  constructor(
    @Inject(INVITE_REPOSITORY)
    private readonly inviteRepository: InviteRepository,
  ) {}

  async handle(event: CompanyCreatedWithAdminEvent): Promise<void> {
    const { adminEmail } = event.attributes;
    if (!adminEmail) return;
    // Generar token hash seguro y expiración (24h)
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    // Crear la invitación (Invite)
    const invite = Invite.create({
      id: new InviteId(uuidv4()),
      userId: new UserId(uuidv4()), // En este punto, si tienes el userId real, úsalo
      email: new InviteEmail(adminEmail),
      token: new InviteToken(token),
      expiresAt: new InviteExpiration(expiresAt),
    });
    // Guardar la invitación
    await this.inviteRepository.save(invite);
  }
}
