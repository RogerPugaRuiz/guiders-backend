import { UserAccount } from './user-account';
import { UserAccountCompanyId } from './value-objects/user-account-company-id';
export const USER_ACCOUNT_REPOSITORY = 'USER_ACCOUNT_REPOSITORY';

export interface UserAccountRepository {
  findByEmail(email: string): Promise<UserAccount | null>;
  findById(id: string): Promise<UserAccount | null>;
  save(userAccount: UserAccount): Promise<void>;
  findByCompanyId(companyId: UserAccountCompanyId): Promise<UserAccount[]>; // Ahora recibe value object
}
