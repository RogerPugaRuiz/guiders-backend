import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PassportModule } from '@nestjs/passport';
import { JwtCookieStrategy } from '../../auth-user/infrastructure/strategies/jwt-cookie.strategy';
import { OidcService } from './services/oidc.service';
import { JwtCookieAuthGuard } from 'src/context/shared/infrastructure/guards/jwt-cookie-auth.guard';
import { BffController } from './controllers/bff-auth.controller';

@Module({
  imports: [
    HttpModule,
    PassportModule.register({ defaultStrategy: 'jwt-cookie' }),
  ],
  controllers: [BffController],
  providers: [JwtCookieStrategy, JwtCookieAuthGuard, OidcService],
  exports: [JwtCookieAuthGuard, OidcService],
})
export class BFFModule {}
