import { Injectable, Logger } from '@nestjs/common';
import { AuthVisitorTokenService } from '../../application/services/auth-visitor-token-service';
import { VisitorAccount } from '../../domain/models/visitor-account';
import {
  JsonWebTokenError,
  JwtService,
  NotBeforeError,
  TokenExpiredError,
} from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiKeyEntity } from 'src/context/auth/api-key/infrastructure/api-key.entity';
import { Repository } from 'typeorm';
import { EncryptAdapter } from 'src/context/auth/api-key/infrastructure/encrypt-adapter';
import { v4 as uuidv4 } from 'uuid';
import { InvalidTokenError, ApiKeyNotFoundError } from './errors';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthVisitorJwt implements AuthVisitorTokenService {
  private readonly logger = new Logger(AuthVisitorJwt.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @InjectRepository(ApiKeyEntity)
    private readonly apiKeyRepository: Repository<ApiKeyEntity>,
    private readonly encryptService: EncryptAdapter,
  ) {}

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    const decoded = this.jwtService.decode<{
      header: {
        kid: string;
      };
      payload: {
        sub: string;
        typ: string;
      };
    }>(refreshToken, { complete: true });
    if (!decoded) {
      throw new InvalidTokenError('Token decoding failed');
    }
    if (decoded['payload']['typ'] !== 'refresh') {
      throw new InvalidTokenError('Token type is not refresh');
    }
    const apiKey = await this.apiKeyRepository.findOne({
      where: { kid: decoded['header']['kid'] },
    });
    if (!apiKey) {
      throw new ApiKeyNotFoundError();
    }

    try {
      this.jwtService.verify(refreshToken, {
        algorithms: ['RS256'],
        secret: apiKey.publicKey,
      });
    } catch (error) {
      if (
        error instanceof TokenExpiredError ||
        error instanceof JsonWebTokenError ||
        error instanceof NotBeforeError
      ) {
        throw new InvalidTokenError(
          `Token verification error: ${error.message}`,
        );
      }
      throw new InvalidTokenError('Token verification failed');
    }
    this.logger.log(`privateKey: ${apiKey.privateKey}`);
    const privateKey = await this.encryptService.decrypt(apiKey.privateKey);
    this.logger.log(`privateKey: ${privateKey}`);

    const accessToken = this.jwtService.sign(
      {
        typ: 'access',
        auth_time: Math.floor(Date.now() / 1000),
        role: ['visitor'],
        username: decoded['payload']['username'] as string,
      },
      {
        subject: decoded['payload']['sub'],
        expiresIn: this.configService.get('ACCESS_TOKEN_EXPIRATION'),
        algorithm: 'RS256',
        keyid: apiKey.kid,
        jwtid: uuidv4(),
        secret: privateKey,
      },
    );
    return Promise.resolve({ accessToken });
  }
  async generate(
    account: VisitorAccount,
    companyId?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { apiKey: account.apiKey.getValue() },
    });
    if (!apiKey) {
      throw new ApiKeyNotFoundError();
    }
    this.logger.log(`privateKey: ${apiKey.privateKey}`);
    const privateKey = await this.encryptService.decrypt(apiKey.privateKey);
    this.logger.log(`privateKey: ${privateKey}`);

    const accessToken = this.jwtService.sign(
      {
        typ: 'access',
        auth_time: Math.floor(
          account.lastLoginAt.get().getValue().getTime() / 1000,
        ),
        role: ['visitor'],
        username: account.id.value,
        companyId,
      },
      {
        subject: account.id.value,
        expiresIn: this.configService.get('ACCESS_TOKEN_EXPIRATION') || '1h',
        algorithm: 'RS256',
        keyid: apiKey.kid,
        jwtid: uuidv4(),
        secret: privateKey,
      },
    );
    const refreshToken = this.jwtService.sign(
      {
        typ: 'refresh',
        auth_time: Math.floor(
          account.lastLoginAt.get().getValue().getTime() / 1000,
        ),
        role: ['visitor'],
        username: account.id.value,
      },
      {
        subject: account.id.value,
        expiresIn: this.configService.get('REFRESH_TOKEN_EXPIRATION'),
        algorithm: 'RS256',
        keyid: apiKey.kid,
        jwtid: uuidv4(),
        secret: privateKey,
      },
    );
    return Promise.resolve({ accessToken, refreshToken });
  }
  async verify(token: string): Promise<any> {
    const decoded = this.jwtService.decode<{
      kid: string;
      sub: string;
    }>(token);
    if (!decoded) {
      throw new InvalidTokenError('Token decoding failed');
    }
    const apiKey = await this.apiKeyRepository.findOne({
      where: { kid: decoded['kid'] },
    });
    if (!apiKey) {
      throw new ApiKeyNotFoundError();
    }

    return this.jwtService.verify(token, {
      algorithms: ['RS256'],
      secret: apiKey.publicKey,
    });
  }
}
