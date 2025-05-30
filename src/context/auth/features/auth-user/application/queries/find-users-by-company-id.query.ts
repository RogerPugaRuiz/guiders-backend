// Query para obtener usuarios por companyId
// Ubicación: src/context/auth/auth-user/application/queries/find-users-by-company-id.query.ts
import { IQuery } from '@nestjs/cqrs';
import { UserAccountCompanyId } from '../../domain/value-objects/user-account-company-id';

export class FindUsersByCompanyIdQuery implements IQuery {
  constructor(public readonly companyId: UserAccountCompanyId) {}
}
