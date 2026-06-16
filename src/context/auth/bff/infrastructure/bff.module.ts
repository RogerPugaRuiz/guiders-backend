import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PassportModule } from '@nestjs/passport';
import { JwtCookieStrategy } from '../../auth-user/infrastructure/strategies/jwt-cookie.strategy';
import { OidcService } from './services/oidc.service';
import { JwtCookieAuthGuard } from 'src/context/shared/infrastructure/guards/jwt-cookie-auth.guard';
import { BffController } from './controllers/bff-auth.controller';
import { IntegrationApiKeyModule } from '../../integration-api-key/infrastructure/integration-api-key.module';
import { EmbedSessionController } from './controllers/embed-session.controller';
import { AuthenticateEmbedSessionCommandHandler } from '../application/commands/authenticate-embed-session.command-handler';
import { BFF_SESSION_SERVICE } from '../domain/services/bff-session.service';
import { RedisBffSessionService } from './services/redis-bff-session.service';

@Module({
  imports: [
    HttpModule,
    PassportModule.register({ defaultStrategy: 'jwt-cookie' }),
    // IntegrationApiKeyModule exporta EMBED_TOKEN_SERVICE y EmbedTokenGuard
    // (integration-api-key.module.ts:75-76). Story 2.1 reusa ambos en
    // EmbedSessionController y AuthenticateEmbedSessionCommandHandler.
    IntegrationApiKeyModule,
  ],
  controllers: [BffController, EmbedSessionController],
  providers: [
    JwtCookieStrategy,
    JwtCookieAuthGuard,
    OidcService,
    AuthenticateEmbedSessionCommandHandler,
    {
      provide: BFF_SESSION_SERVICE,
      useClass: RedisBffSessionService,
    },
  ],
  exports: [
    JwtCookieAuthGuard,
    OidcService,
    BFF_SESSION_SERVICE,
    AuthenticateEmbedSessionCommandHandler,
  ],
})
export class BFFModule {}
