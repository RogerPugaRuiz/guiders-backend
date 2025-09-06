import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PassportModule } from '@nestjs/passport';
import { BFFAuthController } from './controllers/bff-auth.controller';
import { BFFAuthService } from './bff-auth.service';
import { JwtCookieStrategy } from '../../auth-user/infrastructure/strategies/jwt-cookie.strategy';
import { JwtCookieAuthGuard } from 'src/context/shared/infrastructure/guards/jwt-cookie-auth.guard';

@Module({
  imports: [
    HttpModule,
    PassportModule.register({ defaultStrategy: 'jwt-cookie' }),
  ],
  controllers: [BFFAuthController],
  providers: [BFFAuthService, JwtCookieStrategy, JwtCookieAuthGuard],
  exports: [BFFAuthService, JwtCookieAuthGuard],
})
export class BFFModule {}
