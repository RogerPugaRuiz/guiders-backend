// Handler para CompanyCreatedWithAdminEvent que registra un usuario superadmin
// Ubicación: src/context/auth/auth-user/application/events/create-superadmin-on-company-created-with-admin-event.handler.ts
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { CompanyCreatedWithAdminEvent } from 'src/context/company/domain/events/company-created-with-admin.event';
import { Inject } from '@nestjs/common';
import {
  UserAccountRepository,
  USER_ACCOUNT_REPOSITORY,
} from '../../domain/user-account.repository';
import { UserAccount } from '../../domain/user-account';
import { UserAccountEmail } from '../../domain/user-account-email';
import { UserAccountPassword } from '../../domain/user-account-password';
import { UserAccountRoles } from '../../domain/value-objects/user-account-roles';
import { Role } from '../../domain/value-objects/role';

// Este handler escucha el evento de creación de compañía con admin y crea un usuario superadmin en el contexto de auth
@EventsHandler(CompanyCreatedWithAdminEvent)
export class CreateSuperadminOnCompanyCreatedWithAdminEventHandler
  implements IEventHandler<CompanyCreatedWithAdminEvent>
{
  constructor(
    @Inject(USER_ACCOUNT_REPOSITORY)
    private readonly userRepository: UserAccountRepository,
  ) {}

  async handle(event: CompanyCreatedWithAdminEvent): Promise<void> {
    // El payload del evento está en event.attributes
    const { adminEmail } = event.attributes;
    // Si no hay email de admin, no se crea usuario
    if (!adminEmail) return;
    // Por defecto, el password es null (debe ser seteado por invitación o flujo aparte)
    const user = UserAccount.create({
      email: UserAccountEmail.create(adminEmail),
      password: UserAccountPassword.empty(),
      roles: UserAccountRoles.create([Role.superadmin()]), // Rol superadmin
    });
    // Guardar el usuario superadmin
    await this.userRepository.save(user);
  }
}
