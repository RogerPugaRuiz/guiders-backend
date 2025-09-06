import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtCookieAuthGuard extends AuthGuard('jwt-cookie') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw (
        err ||
        new UnauthorizedException('Token de autenticación requerido en cookie')
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return user;
  }
}
