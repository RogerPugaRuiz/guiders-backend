import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKeyEntity } from './api-key.entity';
import { JwtService } from '@nestjs/jwt';
import { EncryptionService } from 'src/shared/service/encryption.service';
import { v4 as uuidv4 } from 'uuid';

export interface ApiKeyAuthJwtPayload {
  clientId: string;
  fingerprint: string;
  token_type: 'access' | 'refresh';
}

@Injectable()
export class ApiKeyAuthService {
  private readonly logger = new Logger(ApiKeyAuthService.name);

  constructor(
    @InjectRepository(ApiKeyEntity)
    private readonly apiKeyRepo: Repository<ApiKeyEntity>,
    private readonly jwtService: JwtService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async authenticate(publicKey: string): Promise<{ clientId: string }> {
    const apiKeyEntity = await this.apiKeyRepo.findOne({
      where: { publicKey },
    });
    if (!apiKeyEntity) {
      throw new UnauthorizedException('Clave pública inválida');
    }
    return { clientId: apiKeyEntity.clientId };
  }

  async createTokens(
    clientId: string,
    fingerprint: string,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const apiKeyEntity = await this.apiKeyRepo.findOne({ where: { clientId } });
    if (!apiKeyEntity) {
      throw new UnauthorizedException('Cliente no encontrado');
    }

    const secretKey = this.encryptionService.decrypt(apiKeyEntity.privateKey);

    try {
      const access_token = this.jwtService.sign(
        { clientId, fingerprint, token_type: 'access' },
        { secret: secretKey, algorithm: 'HS256', expiresIn: '1m' },
      );

      const refresh_token = this.jwtService.sign(
        { clientId, fingerprint, token_type: 'refresh' },
        { secret: secretKey, algorithm: 'HS256', expiresIn: '1h' },
      );

      return { access_token, refresh_token };
    } catch (error) {
      this.logger.error('Error al crear tokens', error);
      throw new UnauthorizedException('Error al crear tokens');
    }
  }

  async refreshToken(
    clientId: string,
    refreshToken: string,
  ): Promise<{ access_token: string }> {
    let decoded: ApiKeyAuthJwtPayload;

    try {
      decoded = this.jwtService.decode<ApiKeyAuthJwtPayload>(refreshToken);
    } catch (error) {
      this.logger.error('Error al decodificar refresh token', error);
      throw new UnauthorizedException('Token inválido');
    }

    if (!decoded || !decoded.clientId || decoded.token_type !== 'refresh') {
      throw new UnauthorizedException('Token inválido');
    }

    const apiKeyEntity = await this.apiKeyRepo.findOne({ where: { clientId } });
    if (!apiKeyEntity || apiKeyEntity.clientId !== decoded.clientId) {
      throw new UnauthorizedException('Cliente no coincide o no existe');
    }

    const secretKey = this.encryptionService.decrypt(apiKeyEntity.privateKey);

    try {
      this.jwtService.verify(refreshToken, {
        secret: secretKey,
        algorithms: ['HS256'],
      });

      const newAccessToken = this.jwtService.sign(
        {
          clientId: decoded.clientId,
          fingerprint: decoded.fingerprint,
          token_type: 'access',
        },
        { secret: secretKey, algorithm: 'HS256', expiresIn: '1m' },
      );
      return { access_token: newAccessToken };
    } catch (error) {
      this.logger.error('Refresh token inválido o expirado', error);
      throw new UnauthorizedException('Refresh Token inválido o expirado');
    }
  }

  async register(): Promise<{ apiKey: string }> {
    const apiKeyEntity = this.apiKeyRepo.create();
    apiKeyEntity.clientId = this.generateClientId();
    apiKeyEntity.publicKey = this.generatePublicKey();
    apiKeyEntity.privateKey = this.generatePrivateKey();

    await this.apiKeyRepo.save(apiKeyEntity);
    return { apiKey: apiKeyEntity.publicKey };
  }

  private generateClientId(): string {
    //uuid
    return `client_${uuidv4()}`;
  }

  private generatePublicKey(): string {
    return `pk_${uuidv4()}`;
  }

  private generatePrivateKey(): string {
    const rawKey = `sk_${uuidv4()}`;
    return this.encryptionService.encrypt(rawKey);
  }
}
