import { UserAccount } from './user-account';
export const USER_ACCOUNT_REPOSITORY = 'USER_ACCOUNT_REPOSITORY';

export interface UserAccountRepository {
  findByEmail(email: string): Promise<UserAccount | null>;
  findById(id: string): Promise<UserAccount | null>;
  save(userAccount: UserAccount): Promise<void>;
}
