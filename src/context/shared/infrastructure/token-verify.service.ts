import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { createPublicKey } from 'crypto';
import * as jwt from 'jsonwebtoken'; // Importar explícitamente jwt para capturar errores
import { ConfigService } from '@nestjs/config';

export interface TokenPayload {
  sub: string;
  typ: string;
  role: string[];
  companyId?: string; // Añadido para incluir companyId si está presente
  iat: number;
  exp: number;
  [key: string]: unknown; // Permite incluir otros elementos no definidos explícitamente
}

// Estructura de un JWK (JSON Web Key)
interface JwkKey {
  kty: string;
  kid: string;
  use: string;
  alg: string;
  n: string;
  e: string;
}

@Injectable()
export class TokenVerifyService {
  private readonly logger = new Logger(TokenVerifyService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtservice: JwtService,
    private readonly http: HttpService,
  ) {}

  async verifyToken(token: string): Promise<TokenPayload> {
    try {
      const decoded = this.jwtservice.decode<{
        header: { kid?: string };
        payload: {
          sub: string;
          typ: string;
          role?: string[];
          realm_access?: { roles: string[] };
          companyId?: string;
        };
      }>(token, { complete: true });

      if (!decoded) {
        throw new UnauthorizedException('Token inválido');
      }

      const { typ } = decoded.payload;

      // Tokens Keycloak tienen typ="Bearer"; tokens de visitantes y usuarios internos tienen typ="access"
      if (typ === 'Bearer') {
        return this.verifyKeycloakToken(token, decoded);
      }

      if (decoded.payload.role?.includes('visitor')) {
        return this.verifyVisitorToken(token, decoded);
      }

      // Token interno firmado con GLOBAL_TOKEN_SECRET
      return this.jwtservice.verify(token, {
        secret: process.env.GLOBAL_TOKEN_SECRET,
      });
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Token expirado');
      }
      this.logger.error(`Error al verificar el token: ${error}`);
      throw new UnauthorizedException('Token inválido');
    }
  }

  /**
   * Verifica un token Keycloak (typ=Bearer) usando el JWKS de Keycloak.
   * Mapea realm_access.roles al campo role[] del TokenPayload.
   */
  private async verifyKeycloakToken(
    token: string,
    decoded: {
      header: { kid?: string };
      payload: {
        sub: string;
        typ: string;
        role?: string[];
        realm_access?: { roles: string[] };
        companyId?: string;
      };
    },
  ): Promise<TokenPayload> {
    const { kid } = decoded.header;
    if (!kid) {
      throw new UnauthorizedException('No kid en token Keycloak');
    }

    const jwksUri =
      this.configService.get<string>('KEYCLOAK_JWKS_URI') ||
      `${this.configService.get<string>('KEYCLOAK_ISSUER')}/protocol/openid-connect/certs`;

    if (!jwksUri) {
      this.logger.error('No se ha configurado KEYCLOAK_JWKS_URI');
      throw new UnauthorizedException(
        'Configuración JWKS Keycloak no disponible',
      );
    }

    const { data } = await firstValueFrom(
      this.http.get<{ keys: JwkKey[] }>(jwksUri),
    );

    const foundKey = data.keys.find((k) => k.kid === kid);
    if (!foundKey) {
      throw new UnauthorizedException(
        'Token Keycloak inválido: kid no encontrado',
      );
    }

    const publicKey = createPublicKey({
      key: {
        kty: foundKey.kty,
        n: foundKey.n,
        e: foundKey.e,
        alg: foundKey.alg,
        ext: true,
      },
      format: 'jwk',
    });

    const pem = publicKey.export({ type: 'spki', format: 'pem' });

    const verified = this.jwtservice.verify<Record<string, unknown>>(token, {
      algorithms: ['RS256'],
      secret: pem,
    });

    // Mapear realm_access.roles al campo role[] esperado por el resto del sistema
    const realmRoles =
      (verified['realm_access'] as { roles?: string[] } | undefined)?.roles ??
      [];

    return {
      ...verified,
      sub: verified['sub'] as string,
      typ: verified['typ'] as string,
      iat: verified['iat'] as number,
      exp: verified['exp'] as number,
      role: realmRoles,
      companyId: verified['companyId'] as string | undefined,
    };
  }

  /**
   * Verifica un token de visitante usando el JWKS interno de la aplicación.
   */
  private async verifyVisitorToken(
    token: string,
    decoded: {
      header: { kid?: string };
      payload: {
        sub: string;
        typ: string;
        role?: string[];
        companyId?: string;
      };
    },
  ): Promise<TokenPayload> {
    const { kid } = decoded.header;
    if (!kid) {
      throw new UnauthorizedException('No kid en token');
    }

    const jwksBase =
      this.configService.get<string>('JWKS_BASE_URL') ||
      this.configService.get<string>('APP_URL');
    if (!jwksBase) {
      this.logger.error(
        'No se ha configurado JWKS_BASE_URL ni APP_URL para obtener JWKS',
      );
      throw new UnauthorizedException('Configuración JWKS no disponible');
    }
    const jwksUrl = new URL(
      'jwks',
      jwksBase.endsWith('/') ? jwksBase : jwksBase + '/',
    ).toString();
    const { data } = await firstValueFrom(
      this.http.get<{ keys: JwkKey[] }>(jwksUrl),
    );

    const foundKey = data.keys.find((k) => k.kid === kid);
    if (!foundKey) {
      throw new UnauthorizedException('Token inválido: kid no encontrado');
    }

    const publicKey = createPublicKey({
      key: {
        kty: foundKey.kty,
        n: foundKey.n,
        e: foundKey.e,
        alg: foundKey.alg,
        ext: true,
      },
      format: 'jwk',
    });

    const pem = publicKey.export({ type: 'spki', format: 'pem' });

    return this.jwtservice.verify(token, {
      algorithms: ['RS256'],
      secret: pem,
    });
  }
}
