// auth/jwt.strategy.ts
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';

export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      algorithms: ['RS256'],
      issuer: 'https://auth.guiders.es/realms/guiders',
      audience: 'console',
      secretOrKeyProvider: passportJwtSecret({
        jwksUri:
          'https://auth.guiders.es/realms/guiders/protocol/openid-connect/certs',
        cache: true,
      }),
    });
  }

  validate(payload: any) {
    return {
      sub: payload.sub,
      email: payload.email,
      roles: payload.realm_access.roles,
    };
  }
}
