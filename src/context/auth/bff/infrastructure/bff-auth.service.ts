import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class BFFAuthService {
  private readonly logger = new Logger(BFFAuthService.name);

  constructor(private readonly httpService: HttpService) {}

  async loginWithKeycloak(
    username: string,
    password: string,
    response: Response,
  ): Promise<{ success: boolean; user?: any }> {
    try {
      const keycloakTokenUrl = `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`;

      const tokenRequest = new URLSearchParams({
        grant_type: 'password',
        client_id: process.env.KEYCLOAK_CLIENT_ID || 'guiders-api',
        username,
        password,
      });

      if (process.env.KEYCLOAK_CLIENT_SECRET) {
        tokenRequest.append(
          'client_secret',
          process.env.KEYCLOAK_CLIENT_SECRET,
        );
      }

      const tokenResponse = await firstValueFrom(
        this.httpService.post(keycloakTokenUrl, tokenRequest, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { access_token, refresh_token, expires_in } = tokenResponse.data;

      // Configurar cookies HttpOnly
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      this.setAuthCookies(response, access_token, refresh_token, expires_in);

      // Extraer información del usuario del token
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument
      const userInfo = await this.getUserInfo(access_token);

      this.logger.log(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        `Usuario autenticado: ${userInfo.email || userInfo.preferred_username}`,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      return { success: true, user: userInfo };
    } catch (error) {
      this.logger.error(
        'Error en login con Keycloak:',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        error.response?.data || error.message,
      );
      throw new UnauthorizedException('Credenciales inválidas');
    }
  }

  async refreshToken(
    refreshToken: string,
    response: Response,
  ): Promise<{ success: boolean }> {
    try {
      const keycloakTokenUrl = `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`;

      const refreshRequest = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.KEYCLOAK_CLIENT_ID || 'guiders-api',
        refresh_token: refreshToken,
      });

      if (process.env.KEYCLOAK_CLIENT_SECRET) {
        refreshRequest.append(
          'client_secret',
          process.env.KEYCLOAK_CLIENT_SECRET,
        );
      }

      const tokenResponse = await firstValueFrom(
        this.httpService.post(keycloakTokenUrl, refreshRequest, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { access_token, refresh_token, expires_in } = tokenResponse.data;

      // Actualizar cookies
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      this.setAuthCookies(response, access_token, refresh_token, expires_in);

      return { success: true };
    } catch (error) {
      this.logger.error(
        'Error renovando token:',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        error.response?.data || error.message,
      );
      throw new UnauthorizedException('Token de renovación inválido');
    }
  }

  logout(response: Response): void {
    // Limpiar cookies
    response.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    response.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/bff/auth',
    });

    this.logger.log('Usuario desconectado - cookies limpiadas');
  }

  private setAuthCookies(
    response: Response,
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
  ): void {
    const isProduction = process.env.NODE_ENV === 'production';

    // Cookie para access token (más corta)
    response.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: expiresIn * 1000, // Convertir a ms
      path: '/',
    });

    // Cookie para refresh token (más larga)
    response.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
      path: '/api/bff/auth', // Solo accesible en rutas de auth
    });
  }

  private async getUserInfo(accessToken: string): Promise<any> {
    try {
      const userInfoUrl = `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/userinfo`;

      const userResponse = await firstValueFrom(
        this.httpService.get(userInfoUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );

      return userResponse.data;
    } catch (error) {
      this.logger.error(
        'Error obteniendo información del usuario:',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        error.response?.data || error.message,
      );
      throw error;
    }
  }
}
