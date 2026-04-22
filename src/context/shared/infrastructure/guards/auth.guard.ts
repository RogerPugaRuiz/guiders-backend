import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { TokenVerifyService } from '../token-verify.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    roles: string[];
    username: string;
    email?: string;
    companyId?: string; // Añadimos companyId al tipado del usuario autenticado
  };
  // Aseguramos que headers esté correctamente tipado
  headers: Record<string, any>;
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly service: TokenVerifyService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Si el endpoint está marcado con @Public(), saltar autenticación
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    try {
      const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
      // ...validación del token o usuario...
      if (!request.headers.authorization) {
        throw new UnauthorizedException('No se a encontrado el token');
      }
      // Forzamos el tipo string para evitar problemas de tipado
      const { prefix, token } = this.extractToken(
        String(request.headers.authorization),
      );
      if (prefix !== 'Bearer') {
        throw new UnauthorizedException('No se permite el tipo de token');
      }
      try {
        // Extraemos companyId del payload del token
        const { sub, typ, role, username, email, companyId } =
          await this.service.verifyToken(token);
        if (typ !== 'access') {
          throw new UnauthorizedException('Token inválido');
        }
        request.user = {
          id: sub,
          roles: role,
          username: (username as string) ?? '',
          email: (email as string) ?? '',
          companyId: (companyId as string) ?? undefined, // Inyectamos companyId si está presente
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new UnauthorizedException(error.message);
        }
        throw new UnauthorizedException('Unauthorized access');
      }
    } catch (error) {
      this.logger.error(`Error en el guard de autenticación : ${error}`);
      throw error;
    }

    return true;
  }

  private extractToken(authorization: string): {
    prefix: string;
    token: string;
  } {
    const [prefix, token] = authorization.split(' ');
    return { prefix, token };
  }
}
