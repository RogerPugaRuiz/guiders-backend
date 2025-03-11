export const USER_TOKEN_SERVICE = 'UserTokenService';
export interface UserTokenService {
  generate(data: { id: string; email: string }): Promise<{
    accessToken: string;
    refreshToken: string;
  }>;
  verify(token: string): Promise<any>;

  refresh(refreshToken: string): Promise<{ accessToken: string }>;
}
