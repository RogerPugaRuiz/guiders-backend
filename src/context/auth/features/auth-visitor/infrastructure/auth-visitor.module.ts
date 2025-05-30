import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisitorAccountEntity } from './visitor-account.entity';
import { AuthVisitorController } from './auth-visitor.controller';
import { AuthVisitorService } from './services/auth-visitor.service';
import { AuthVisitorJwt } from './services/auth-visitor-jwt';
import { AUTH_VISITOR_TOKEN_SERVICE } from '../application/services/auth-visitor-token-service';
import { AUTH_VISITOR_REPOSITORY } from '../domain/repositories/auth-visitor.repository';
import { AuthVisitorOrmRepository } from './services/auth-visitor-orm-repository';
import { GenerateVisitorTokens } from '../application/usecase/generate-visitor-tokens.usecase';
import { RegisterVisitor } from '../application/usecase/register-visitor.usecase';
import { VisitorAccountMapper } from './mapper/visitor-account-mapper';
import { ApiKeyEntity } from '../../api-key/infrastructure/api-key.entity';
import { EncryptAdapter } from '../../api-key/infrastructure/encrypt-adapter';
import { RefreshVisitorToken } from '../application/usecase/refresh-visitor-token.usecase';
import { TokenVerifyService } from 'src/context/shared/infrastructure/token-verify.service';
import { HttpModule } from '@nestjs/axios';
import { API_KEY_REPOSITORY } from '../../api-key/domain/repository/api-key.repository';
import { ApiKeyOrmAdapter } from '../../api-key/infrastructure/api-key-orm-adapter';
import { ValidateDomainApiKeyAdapter } from './services/validate-domain-api-key-adapter';
import { VALIDATE_DOMAIN_API_KEY } from '../application/services/validate-domain-api-key';
import { ApiKeyMapper } from '../../api-key/infrastructure/api-key.mapper';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([VisitorAccountEntity, ApiKeyEntity]),
  ],
  controllers: [AuthVisitorController],
  providers: [
    { provide: AUTH_VISITOR_TOKEN_SERVICE, useClass: AuthVisitorJwt },
    { provide: AUTH_VISITOR_REPOSITORY, useClass: AuthVisitorOrmRepository },
    { provide: API_KEY_REPOSITORY, useClass: ApiKeyOrmAdapter },
    { provide: VALIDATE_DOMAIN_API_KEY, useClass: ValidateDomainApiKeyAdapter },
    ApiKeyMapper,
    ValidateDomainApiKeyAdapter,
    AuthVisitorService,
    GenerateVisitorTokens,
    RefreshVisitorToken,
    RegisterVisitor,
    VisitorAccountMapper,
    EncryptAdapter,
    TokenVerifyService,
  ],
})
export class AuthVisitorModule {}
