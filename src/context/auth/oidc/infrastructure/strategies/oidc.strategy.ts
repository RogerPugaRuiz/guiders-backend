import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-openidconnect';

// Perfil mínimo tipado para reducir accesos inseguros
interface OidcProfileEmail {
  value?: string;
}
interface OidcProfilePhoto {
  value?: string;
}
interface OidcMinimalProfile {
  displayName?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  emails?: OidcProfileEmail[];
  email?: string;
  photos?: OidcProfilePhoto[];
  picture?: string;
  // Otras propiedades ignoradas deliberadamente
  [key: string]: unknown;
}

@Injectable()
// Extiende PassportStrategy: el constructor de la clase base está tipado dinámicamente por la librería
// justificación: la regla no-unsafe-call se dispara por tipos externos flexibles.
// eslint-disable-next-line @typescript-eslint/no-unsafe-call
export class OidcStrategy extends PassportStrategy(Strategy, 'oidc') {
  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super({
      issuer: process.env.OIDC_ISSUER_URL || 'https://accounts.google.com',
      authorizationURL:
        process.env.OIDC_AUTH_URL ||
        'https://accounts.google.com/o/oauth2/v2/auth',
      tokenURL:
        process.env.OIDC_TOKEN_URL || 'https://oauth2.googleapis.com/token',
      userInfoURL:
        process.env.OIDC_USERINFO_URL ||
        'https://openidconnect.googleapis.com/v1/userinfo',
      clientID: process.env.OIDC_CLIENT_ID || '',
      clientSecret: process.env.OIDC_CLIENT_SECRET || '',
      callbackURL:
        process.env.OIDC_CALLBACK_URL ||
        'http://localhost:3000/auth/oidc/callback',
      scope: 'openid profile email',
    });
  }

  // Estrategia Passport requiere callback style validate
  validate(
    _issuer: string,
    sub: string,
    profile: OidcMinimalProfile,
    accessToken: string,
    refreshToken: string,
    done: (error: unknown, user?: Record<string, unknown>) => void,
  ): void {
    try {
      const primaryEmail = profile.emails?.[0]?.value ?? profile.email;
      const primaryPhoto = profile.photos?.[0]?.value ?? profile.picture;
      const displayName =
        profile.displayName ?? profile.name ?? profile.given_name ?? undefined;
      // El shape de profile.name varía según proveedor; hacemos narrow progresivo
      const nameObj = (
        profile as { name?: { givenName?: string; familyName?: string } }
      ).name;
      const user = {
        id: sub,
        email: primaryEmail,
        name: displayName,
        firstName: nameObj?.givenName ?? profile.given_name,
        lastName: nameObj?.familyName ?? profile.family_name,
        picture: primaryPhoto,
        provider: 'oidc',
        accessToken,
        refreshToken,
      } satisfies Record<string, unknown>;
      done(null, user);
    } catch {
      done(new UnauthorizedException('Error en validación OIDC'));
    }
  }
}
