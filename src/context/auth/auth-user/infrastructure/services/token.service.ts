import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserTokenService } from '../../application/service/user-token-service';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedError } from '../../application/errors/unauthorized.error';

@Injectable()
export class TokenService implements UserTokenService {
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
    typ: string;
  }> {
    return this.jwtService.verify(token, {
      secret: process.env.GLOBAL_TOKEN_SECRET,
    });
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    const payload = await this.verify(refreshToken);
    if (payload.typ !== 'refresh') {
      throw new UnauthorizedError('Token inválido');
    }
    return {
      accessToken: this.createAccessToken({
        id: payload.sub.toString(),
        email: payload.email,
        username: payload.username,
      }),
    };
  }

  private createAccessToken(data: {
    id: string;
    email: string;
    username: string;
    roles?: string[];
  }) {
    const accessToken = this.jwtService.sign(
      {
        username: data.username,
        email: data.email,
        role: data.roles ?? ['commercial'],
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
  }) {
    const refreshToken = this.jwtService.sign(
      {
        username: data.username,
        email: data.email,
        role: data.roles ?? ['commercial'],
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
