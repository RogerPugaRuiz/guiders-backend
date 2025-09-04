import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-openidconnect';

@Injectable()
export class OidcStrategy extends PassportStrategy(Strategy, 'oidc') {
  constructor() {
    super({
      issuer: process.env.OIDC_ISSUER_URL || 'https://accounts.google.com',
      authorizationURL: process.env.OIDC_AUTH_URL || 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenURL: process.env.OIDC_TOKEN_URL || 'https://oauth2.googleapis.com/token',
      userInfoURL: process.env.OIDC_USERINFO_URL || 'https://openidconnect.googleapis.com/v1/userinfo',
      clientID: process.env.OIDC_CLIENT_ID || '',
      clientSecret: process.env.OIDC_CLIENT_SECRET || '',
      callbackURL: process.env.OIDC_CALLBACK_URL || 'http://localhost:3000/auth/oidc/callback',
      scope: 'openid profile email',
    });
  }

  async validate(
    issuer: string,
    sub: string,
    profile: any,
    accessToken: string,
    refreshToken: string,
    done: (error: any, user?: any) => void,
  ): Promise<any> {
    try {
      const user = {
        id: sub,
        email: profile.emails?.[0]?.value || profile.email,
        name: profile.displayName || profile.name || profile.given_name,
        firstName: profile.name?.givenName || profile.given_name,
        lastName: profile.name?.familyName || profile.family_name,
        picture: profile.photos?.[0]?.value || profile.picture,
        provider: 'oidc',
        accessToken,
        refreshToken,
      };

      return done(null, user);
    } catch (error) {
      return done(new UnauthorizedException('Error en validación OIDC'), null);
    }
  }
}