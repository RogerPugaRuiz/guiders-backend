import { Injectable, UnauthorizedException } from '@nestjs/common';
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
  iat: number;
  exp: number;
}

@Injectable()
export class TokenVerifyService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtservice: JwtService,
    private readonly http: HttpService,
  ) {}

  async verifyToken(token: string): Promise<TokenPayload> {
    try {
      const decoded = this.jwtservice.decode<{
        header: { kid?: string };
        payload: { sub: string; typ: string; role: string[] };
      }>(token, { complete: true });

      if (!decoded) {
        throw new UnauthorizedException('Token inválido');
      }

      if (decoded.payload.role.includes('visitor')) {
        const { kid } = decoded.header;
        if (!kid) {
          throw new UnauthorizedException('No kid en token');
        }

        const { data } = await firstValueFrom(
          this.http.get<{
            keys: {
              kty: string;
              kid: string;
              use: string;
              alg: string;
              n: string;
              e: string;
            }[];
          }>(`${this.configService.get('APP_URL')}/jwks`),
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
          publicKey: pem,
        });
      }

      return this.jwtservice.verify(token, {
        secret: process.env.GLOBAL_TOKEN_SECRET,
      });
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Token expirado');
      }
      throw new UnauthorizedException('Token inválido');
    }
  }
}
