import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeyEntity } from './api-key.entity';
import { ApiKeyController } from './api-key.controller';
import { ApiKeyService } from './api-key.service';
import { CreateApiKeyForDomainUseCase } from '../application/usecase/create-api-key-for-domain.usecase';
import { API_KEY_REPOSITORY } from '../domain/repository/api-key.repository';
import { ApiKeyOrmAdapter } from './api-key-orm-adapter';
import { AsymmetricKeyGeneratorService } from './asymmetric-key-generator.service';
import { EncryptAdapter } from './encrypt-adapter';
import { ApiKeyMapper } from './api-key.mapper';
import { JwksController } from './jwks.controller';
import { JwksService } from './jwks.service';
import { GetAllApiKeysUseCase } from '../application/usecase/get-all-api-keys.usecase';
import { Sha256HashStrategy } from '../../../shared/infrastructure/sha-256-hash-strategy';
import { API_KEY_ENCRYPT_PRIVATE_KEY } from '../application/services/api-key-encrypt-private-key';
import { API_KEY_HASHER } from '../application/services/api-key-hasher';
import { API_KEY_GENERATE_KEYS } from '../application/services/api-key-generate-keys';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKeyEntity])],
  providers: [
    { provide: API_KEY_REPOSITORY, useClass: ApiKeyOrmAdapter },
    {
      provide: API_KEY_GENERATE_KEYS,
      useClass: AsymmetricKeyGeneratorService,
    },
    { provide: API_KEY_ENCRYPT_PRIVATE_KEY, useClass: EncryptAdapter },
    { provide: API_KEY_HASHER, useClass: Sha256HashStrategy },
    ApiKeyService,
    ApiKeyMapper,
    CreateApiKeyForDomainUseCase,
    GetAllApiKeysUseCase,
    JwksService,
  ],
  controllers: [ApiKeyController, JwksController],
})
export class ApiKeyModule {}
