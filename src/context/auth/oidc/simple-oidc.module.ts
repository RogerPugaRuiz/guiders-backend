import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { OidcStrategy } from './infrastructure/strategies/oidc.strategy';
import { SimpleOidcController } from './infrastructure/controllers/simple-oidc.controller';
import { OidcAuthGuard } from './infrastructure/guards/oidc-auth.guard';
import { ExtendedAuthGuard } from './infrastructure/guards/extended-auth.guard';

@Module({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  imports: [PassportModule.register({ defaultStrategy: 'oidc' })],
  controllers: [SimpleOidcController],
  providers: [OidcStrategy, OidcAuthGuard, ExtendedAuthGuard],
  exports: [OidcStrategy, OidcAuthGuard, ExtendedAuthGuard],
})
export class SimpleOidcModule {}
