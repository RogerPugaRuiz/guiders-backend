/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
// auth/jwt.strategy.ts
import { Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';

export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor() {
    const issuer =
      process.env.KEYCLOAK_ISSUER || 'http://localhost:8080/realms/guiders';
    const jwksUri =
      process.env.KEYCLOAK_JWKS_URI ||
      'http://localhost:8080/realms/guiders/protocol/openid-connect/certs';
    const audience = process.env.KEYCLOAK_AUDIENCE || 'console';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      algorithms: ['RS256'],
      issuer,
      audience,
      secretOrKeyProvider: passportJwtSecret({
        jwksUri,
        cache: true,
      }),
    });

    // Debug: Mostrar las variables de entorno de Keycloak (después de super())
    this.logger.debug('Configuración de variables de entorno de Keycloak');
    this.logger.debug(
      `KEYCLOAK_ISSUER: ${process.env.KEYCLOAK_ISSUER || 'NO DEFINIDA (usando fallback)'}`,
    );
    this.logger.debug(
      `KEYCLOAK_JWKS_URI: ${process.env.KEYCLOAK_JWKS_URI || 'NO DEFINIDA (usando fallback)'}`,
    );
    this.logger.debug(
      `KEYCLOAK_AUDIENCE: ${process.env.KEYCLOAK_AUDIENCE || 'NO DEFINIDA (usando fallback)'}`,
    );

    this.logger.debug('Valores finales utilizados en JWT Strategy:');
    this.logger.debug(`Issuer: ${issuer}`);
    this.logger.debug(`JWKS URI: ${jwksUri}`);
    this.logger.debug(`Audience: ${audience}`);
  }

  validate(payload: any) {
    this.logger.debug('Validando token JWT');
    this.logger.debug(`Sub (User ID): ${payload.sub}`);
    this.logger.debug(`Email: ${payload.email}`);
    this.logger.debug(
      `Realm Access Roles: ${JSON.stringify(payload.realm_access?.roles || [])}`,
    );
    this.logger.debug(`Issuer del token: ${payload.iss}`);
    this.logger.debug(`Audience del token: ${payload.aud}`);

    return {
      sub: payload.sub,
      email: payload.email,
      roles: payload.realm_access.roles,
    };
  }
}
