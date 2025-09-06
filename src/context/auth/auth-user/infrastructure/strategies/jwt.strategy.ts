// auth/jwt.strategy.ts
import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
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
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor() {
    const issuer =
      process.env.KEYCLOAK_ISSUER ?? 'http://localhost:8080/realms/guiders';
    const jwksUri =
      process.env.KEYCLOAK_JWKS_URI ??
      `http://localhost:8080/realms/guiders/protocol/openid-connect/certs`;
    const audience = process.env.KEYCLOAK_AUDIENCE ?? 'guiders-api'; // << cliente API

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
  }

  validate(payload: KeycloakJwt) {
    const roles = Array.isArray(payload.realm_access?.roles)
      ? payload.realm_access.roles
      : [];
    return { sub: payload.sub, email: payload.email, roles };
  }
}
