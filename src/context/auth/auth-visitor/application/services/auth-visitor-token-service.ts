import { VisitorAccount } from '../../domain/models/visitor-account.aggregate';

export const AUTH_VISITOR_TOKEN_SERVICE = 'AuthVisitorTokenService';
export interface AuthVisitorTokenService {
  generate(
    account: VisitorAccount,
    companyId?: string,
  ): Promise<{ accessToken: string; refreshToken: string }>;
  verify(token: string): Promise<any>;

  refresh(refreshToken: string): Promise<{ accessToken: string }>;
}
// Compare this snippet from src/context/commercial/auth-user/application/service/user-token-service.ts:
