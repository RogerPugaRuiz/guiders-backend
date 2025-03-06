import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { ApiKeyAuthService } from './api-key-auth.service';

@Controller('apikey/auth')
export class ApiKeyAuthController {
  constructor(private readonly apiKeyAuthService: ApiKeyAuthService) {}

  /**
   * Recibe la clave pública y devuelve el clientId
   */
  @Post('login')
  async authenticate(@Body('publicKey') publicKey: string) {
    if (!publicKey) {
      throw new UnauthorizedException('Clave pública requerida');
    }

    const { clientId } = await this.apiKeyAuthService.authenticate(publicKey);
    return { message: 'Autenticación exitosa', clientId };
  }

  /**
   * Recibe el clientId (identificado en el login) y un fingerprint,
   * y devuelve los tokens generados.
   */
  @Post('tokens')
  async createTokens(
    @Body('clientId') clientId: string,
    @Body('fingerprint') fingerprint: string,
  ) {
    if (!clientId || !fingerprint) {
      throw new UnauthorizedException('Datos incompletos');
    }
    return await this.apiKeyAuthService.createTokens(clientId);
  }

  /**
   * Recibe el clientId y refresh token, y retorna un nuevo access token
   */
  @Post('refresh')
  async refreshToken(
    @Body('clientId') clientId: string,
    @Body('refreshToken') refreshToken: string,
  ) {
    if (!clientId || !refreshToken) {
      throw new UnauthorizedException('Datos incompletos');
    }
    return await this.apiKeyAuthService.refreshToken(refreshToken);
  }

  /**
   * Registra un nuevo cliente con su clave pública y privada
   */
  @Post('register')
  async register(): Promise<{ apiKey: string }> {
    return await this.apiKeyAuthService.register();
  }
}
