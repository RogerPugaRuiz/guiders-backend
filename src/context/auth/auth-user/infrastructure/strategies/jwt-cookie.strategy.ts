import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { passportJwtSecret } from 'jwks-rsa';

interface KeycloakJwt {
  sub: string;
  email?: string;
  iss: string;
  aud: string | string[];
  realm_access?: { roles?: string[] };
  resource_access?: Record<string, { roles?: string[] }>;
}

@Injectable()
export class JwtCookieStrategy extends PassportStrategy(
  Strategy,
  'jwt-cookie',
) {
  private readonly logger = new Logger(JwtCookieStrategy.name);

  constructor() {
    const issuer =
      process.env.KEYCLOAK_ISSUER ?? 'http://localhost:8080/realms/guiders';
    const jwksUri =
      process.env.KEYCLOAK_JWKS_URI ??
      'http://localhost:8080/realms/guiders/protocol/openid-connect/certs';
    const audience = process.env.KEYCLOAK_AUDIENCE ?? 'account';

    super({
      // Extraer JWT de cookies en lugar del header
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          let token = null;
          if (request && request.cookies) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            token = request.cookies['access_token'];
          }
          return token;
        },
      ]),
      algorithms: ['RS256'],
      issuer,
      audience,
      ignoreExpiration: false,
      secretOrKeyProvider: passportJwtSecret({
        jwksUri,
        cache: true,
        cacheMaxEntries: 5,
        cacheMaxAge: 10 * 60 * 1000,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
      }),
    });

    this.logger.debug('🍪 JWT Cookie Strategy initialized');
    this.logger.debug(`  - Issuer: ${issuer}`);
    this.logger.debug(`  - JWKS URI: ${jwksUri}`);
    this.logger.debug(`  - Audience: ${audience}`);
  }

  validate(payload: KeycloakJwt) {
    this.logger.debug('🍪 Validating JWT from cookie');
    this.logger.debug(`  - User ID: ${payload.sub}`);
    this.logger.debug(`  - Email: ${payload.email}`);

    const roles = Array.isArray(payload.realm_access?.roles)
      ? payload.realm_access.roles
      : [];

    return { sub: payload.sub, email: payload.email, roles };
  }
}
