import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { BFFAuthService } from 'src/context/auth/bff/infrastructure/bff-auth.service';

@Injectable()
export class TokenRefreshMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TokenRefreshMiddleware.name);

  constructor(private readonly bffAuthService: BFFAuthService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const accessToken = req.cookies['access_token'];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const refreshToken = req.cookies['refresh_token'];

    // Si no hay access token pero sí refresh token, intentar renovar
    if (!accessToken && refreshToken) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        await this.bffAuthService.refreshToken(refreshToken, res);
        this.logger.debug('Token renovado automáticamente');
      } catch (error) {
        this.logger.warn('Error renovando token automáticamente:', error);
        // Limpiar cookies inválidas
        res.clearCookie('refresh_token');
      }
    }

    next();
  }
}
