import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { OidcStrategy } from './infrastructure/strategies/oidc.strategy';
import { OidcController } from './infrastructure/controllers/oidc.controller';
import { OidcAuthGuard } from './infrastructure/guards/oidc-auth.guard';
import { ExtendedAuthGuard } from './infrastructure/guards/extended-auth.guard';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'oidc' })],
  controllers: [OidcController],
  providers: [OidcStrategy, OidcAuthGuard, ExtendedAuthGuard],
  exports: [OidcStrategy, OidcAuthGuard, ExtendedAuthGuard],
})
export class OidcModule {}
