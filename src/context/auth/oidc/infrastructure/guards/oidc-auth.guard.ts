import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

interface OidcAuthenticatedUser {
  id: string;
  email?: string;
  name?: string;
  provider: string;
  accessToken?: string;
  refreshToken?: string;
  [key: string]: unknown;
}

@Injectable()
// eslint-disable-next-line @typescript-eslint/no-unsafe-call
export class OidcAuthGuard extends (AuthGuard('oidc') as new (
  ...args: never[]
) => object) {
  handleRequest(err: unknown, user: unknown): OidcAuthenticatedUser {
    if (err) throw err as Error;
    if (!user || typeof user !== 'object') {
      throw new UnauthorizedException('Autenticación OIDC fallida');
    }
    const raw = user as Record<string, unknown>;
    return {
      id: String(raw.id),
      email: typeof raw.email === 'string' ? raw.email : undefined,
      name: typeof raw.name === 'string' ? raw.name : undefined,
      provider: typeof raw.provider === 'string' ? raw.provider : 'oidc',
      accessToken:
        typeof raw.accessToken === 'string' ? raw.accessToken : undefined,
      refreshToken:
        typeof raw.refreshToken === 'string' ? raw.refreshToken : undefined,
    };
  }
}
