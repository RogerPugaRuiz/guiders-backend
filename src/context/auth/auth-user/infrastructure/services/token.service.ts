import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserTokenService } from '../../application/service/user-token-service';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedError } from '../../application/errors/unauthorized.error';

@Injectable()
export class TokenService implements UserTokenService {
  private readonly logger = new Logger(TokenService.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  generate(data: {
    id: string;
    username: string;
    email: string;
    roles?: string[];
  }): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.createAccessToken(data);
    const refreshToken = this.createRefreshToken(data);

    return Promise.resolve({ accessToken, refreshToken });
  }
  verify(token: string): Promise<{
    sub: number;
    username: string;
    email: string;
    role: string[];
    companyId: string;
    typ: string;
  }> {
    return this.jwtService.verify(token, {
      secret: process.env.GLOBAL_TOKEN_SECRET,
    });
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    const payload = await this.verify(refreshToken);
    this.logger.debug(
      'Refresh Token Payload:',
      JSON.stringify(payload, null, 2),
    );

    if (payload.typ !== 'refresh') {
      throw new UnauthorizedError('Token inválido');
    }

    // Asegurarse de que roles y companyId se pasen correctamente
    const userData = {
      id: payload.sub.toString(),
      email: payload.email,
      username: payload.username,
      roles: Array.isArray(payload.role) ? payload.role : [],
      companyId: payload.companyId || '',
    };

    this.logger.debug(
      'User data for new access token:',
      JSON.stringify(userData, null, 2),
    );

    return {
      accessToken: this.createAccessToken(userData),
    };
  }

  private createAccessToken(data: {
    id: string;
    email: string;
    username: string;
    roles?: string[];
    companyId?: string;
  }) {
    const accessToken = this.jwtService.sign(
      {
        username: data.username,
        email: data.email,
        role: data.roles ?? [],
        companyId: data.companyId,
        typ: 'access',
      },
      {
        expiresIn: this.configService.get('ACCESS_TOKEN_EXPIRATION'),
        secret: process.env.GLOBAL_TOKEN_SECRET,
        subject: data.id,
      },
    );
    return accessToken;
  }
  private createRefreshToken(data: {
    id: string;
    email: string;
    username: string;
    roles?: string[];
    companyId?: string;
  }) {
    const refreshToken = this.jwtService.sign(
      {
        username: data.username,
        email: data.email,
        role: data.roles ?? [],
        companyId: data.companyId,
        typ: 'refresh',
      },
      {
        expiresIn: this.configService.get('REFRESH_TOKEN_EXPIRATION'),
        secret: process.env.GLOBAL_TOKEN_SECRET,
        subject: data.id,
      },
    );
    return refreshToken;
  }
}
