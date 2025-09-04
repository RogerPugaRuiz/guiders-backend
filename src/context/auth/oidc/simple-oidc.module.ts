import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { OidcStrategy } from './infrastructure/strategies/oidc.strategy';
import { SimpleOidcController } from './infrastructure/controllers/simple-oidc.controller';
import { OidcAuthGuard } from './infrastructure/guards/oidc-auth.guard';
import { ExtendedAuthGuard } from './infrastructure/guards/extended-auth.guard';
import { TokenVerifyService } from 'src/context/shared/infrastructure/token-verify.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'oidc' }),
  ],
  controllers: [SimpleOidcController],
  providers: [
    OidcStrategy,
    OidcAuthGuard,
    ExtendedAuthGuard,
    // We'll need TokenVerifyService for the extended guard
    // Note: This should ideally be imported from a shared module
  ],
  exports: [
    OidcStrategy,
    OidcAuthGuard,
    ExtendedAuthGuard,
  ],
})
export class SimpleOidcModule {}