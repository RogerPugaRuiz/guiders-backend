/**
 * Guard que extrae y valida el `Authorization: Bearer <token>` header
 * para los endpoints de embed.
 *
 * A diferencia de `IntegrationApiKeyGuard` (que valida API keys de
 * integradores B2B), este guard valida tokens opacos emitidos por
 * `/v2/integration/embed/start`.
 *
 * El token NO se valida contra Redis aquí — solo se valida el formato.
 * La validación completa (Redis lookup) la hace el command handler
 * vía `EmbedTokenService.validateToken()`. Esto evita una llamada
 * extra a Redis en cada request y mantiene el guard rápido.
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

export const EMBED_TOKEN_HEADER = 'authorization';
const BEARER_PREFIX = 'Bearer ';
const BASE64URL_REGEX = /^[A-Za-z0-9_-]{43}$/;

export interface EmbedTokenRequest extends Request {
  embedToken: string;
}

@Injectable()
export class EmbedTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<EmbedTokenRequest>();
    const authHeader = request.headers[EMBED_TOKEN_HEADER];

    if (!authHeader || typeof authHeader !== 'string') {
      throw new UnauthorizedException({
        code: 'EMBED_TOKEN_MISSING',
        message: 'Authorization header requerido en formato "Bearer <token>"',
        statusCode: 401,
      });
    }

    if (!authHeader.startsWith(BEARER_PREFIX)) {
      throw new UnauthorizedException({
        code: 'EMBED_TOKEN_INVALID',
        message: 'Authorization header debe empezar con "Bearer "',
        statusCode: 401,
      });
    }

    const token = authHeader.substring(BEARER_PREFIX.length).trim();

    if (!token || !BASE64URL_REGEX.test(token)) {
      throw new UnauthorizedException({
        code: 'EMBED_TOKEN_INVALID',
        message: 'Embed token con formato inválido (debe ser base64url de 43 chars)',
        statusCode: 401,
      });
    }

    request.embedToken = token;
    return true;
  }
}
