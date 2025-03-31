import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { TokenVerifyService } from '../token-verify.service';

export interface AuthenticatedRequest extends Request {
  user?: { id: string; roles: string[] };
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly service: TokenVerifyService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    // ...validación del token o usuario...
    if (!request.headers.authorization) {
      throw new UnauthorizedException('No autorizado');
    }
    const { prefix, token } = this.extractToken(request.headers.authorization);
    if (prefix !== 'Bearer') {
      throw new UnauthorizedException('No autorizado');
    }
    try {
      const { sub, typ, role } = await this.service.verifyToken(token);
      if (typ !== 'access') {
        throw new UnauthorizedException('Token inválido');
      }

      request.user = { id: sub, roles: role };
    } catch (error) {
      console.error(error);
      throw new UnauthorizedException('No autorizado');
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
