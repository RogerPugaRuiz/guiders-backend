import { Module, Provider } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { IntegrationApiKeyEntity } from './integration-api-key.entity';
import { IntegrationApiKeyController } from './integration-api-key.controller';
import { IntegrationApiKeyOrmAdapter } from './integration-api-key-orm-adapter';
import { IntegrationApiKeyMapper } from './integration-api-key.mapper';
import { IntegrationApiKeyGeneratorService } from './integration-api-key-generator.service';
import { IntegrationApiKeyGuard } from './integration-api-key.guard';
import { INTEGRATION_API_KEY_REPOSITORY } from '../domain/repository/integration-api-key.repository';
import { INTEGRATION_API_KEY_GENERATOR } from '../application/services/integration-api-key-generator';
import { CreateIntegrationApiKeyCommandHandler } from '../application/commands/create-integration-api-key.command-handler';
import { RevokeIntegrationApiKeyCommandHandler } from '../application/commands/revoke-integration-api-key.command-handler';
import { ListIntegrationApiKeysQueryHandler } from '../application/queries/list-integration-api-keys.query-handler';
import { TokenVerifyService } from '../../../shared/infrastructure/token-verify.service';
import { AuthGuard } from '../../../shared/infrastructure/guards/auth.guard';
import { RolesGuard } from '../../../shared/infrastructure/guards/role.guard';
import { EMBED_TOKEN_SERVICE } from '../domain/services/embed-token.service';
import { RedisEmbedTokenService } from './services/redis-embed-token.service';
import { CreateEmbedTokenCommandHandler } from '../application/commands/create-embed-token.command-handler';
import { EmbedController } from './controllers/embed.controller';
import { WHITE_LABEL_CONFIG_REPOSITORY } from '../../../white-label/domain/white-label-config.repository';
import { MongoWhiteLabelConfigRepositoryImpl } from '../../../white-label/infrastructure/persistence/mongo-white-label-config.repository.impl';
import { USER_ACCOUNT_REPOSITORY } from '../../../auth/auth-user/domain/user-account.repository';
import { UserAccountService } from '../../../auth/auth-user/infrastructure/services/user-account.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([IntegrationApiKeyEntity]),
    JwtModule.register({}),
    HttpModule,
    ConfigModule,
  ],
  providers: [
    {
      provide: INTEGRATION_API_KEY_REPOSITORY,
      useClass: IntegrationApiKeyOrmAdapter,
    },
    {
      provide: INTEGRATION_API_KEY_GENERATOR,
      useClass: IntegrationApiKeyGeneratorService,
    },
    {
      provide: EMBED_TOKEN_SERVICE,
      useClass: RedisEmbedTokenService,
    },
    {
      provide: WHITE_LABEL_CONFIG_REPOSITORY,
      useClass: MongoWhiteLabelConfigRepositoryImpl,
    },
    {
      provide: USER_ACCOUNT_REPOSITORY,
      useClass: UserAccountService,
    },
    IntegrationApiKeyMapper,
    CreateIntegrationApiKeyCommandHandler,
    RevokeIntegrationApiKeyCommandHandler,
    ListIntegrationApiKeysQueryHandler,
    CreateEmbedTokenCommandHandler,
    IntegrationApiKeyGuard,
    TokenVerifyService,
    AuthGuard,
    RolesGuard,
  ],
  controllers: [IntegrationApiKeyController, EmbedController],
  exports: [
    IntegrationApiKeyGuard,
    INTEGRATION_API_KEY_REPOSITORY,
    EMBED_TOKEN_SERVICE,
  ],
})
export class IntegrationApiKeyModule {}
