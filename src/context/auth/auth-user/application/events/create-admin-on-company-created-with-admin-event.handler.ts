// Handler para CompanyCreatedWithAdminEvent que registra un usuario admin
// Ubicación: src/context/auth/auth-user/application/events/create-admin-on-company-created-with-admin-event.handler.ts
import { EventsHandler, IEventHandler, EventPublisher } from '@nestjs/cqrs';
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
import { UserAccountId } from '../../domain/user-account-id';
import { UserAccountCompanyId } from '../../domain/value-objects/user-account-company-id';
import { UserAccountName } from '../../domain/value-objects/user-account-name';

// Este handler escucha el evento de creación de compañía con admin y crea un usuario admin en el contexto de auth
@EventsHandler(CompanyCreatedWithAdminEvent)
export class CreateAdminOnCompanyCreatedWithAdminEventHandler
  implements IEventHandler<CompanyCreatedWithAdminEvent>
{
  constructor(
    @Inject(USER_ACCOUNT_REPOSITORY)
    private readonly userRepository: UserAccountRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async handle(event: CompanyCreatedWithAdminEvent): Promise<void> {
    // El payload del evento está en event.attributes
    const { adminEmail, adminName, userId, companyId } = event.attributes;
    // Si no hay email o nombre de admin, no se crea usuario
    if (!adminEmail || !adminName || !userId || !companyId) return;
    // Por defecto, el password es null (debe ser seteado por invitación o flujo aparte)
    const user = UserAccount.create({
      id: UserAccountId.create(userId),
      email: UserAccountEmail.create(adminEmail),
      name: new UserAccountName(adminName),
      password: UserAccountPassword.empty(),
      roles: UserAccountRoles.create([Role.admin()]), // Rol admin
      companyId: UserAccountCompanyId.create(companyId), // Asocia el usuario admin a la compañía creada
    });
    // Publica los eventos de dominio aplicados en el aggregate
    const userContext = this.publisher.mergeObjectContext(user);
    await this.userRepository.save(userContext);
    userContext.commit();
  }
}
