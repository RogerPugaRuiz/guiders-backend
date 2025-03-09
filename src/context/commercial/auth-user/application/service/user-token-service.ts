export const USER_TOKEN_SERVICE = 'UserTokenService';
export interface UserTokenService {
  generate(data: any): Promise<{
    accessToken: string;
    refreshToken: string;
  }>;
  verify(token: string): Promise<any>;
}
