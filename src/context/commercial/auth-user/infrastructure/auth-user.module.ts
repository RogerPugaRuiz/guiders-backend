import { Module } from '@nestjs/common';
import { AuthUserController } from './auth-user.controller';
import { AuthUserService } from './services/auth-user.service';
import { UserAccountService } from './services/user-account.service';
import { UserAccountEntity } from './user-account.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRegisterUseCase } from '../application/usecases/user-register.usecase';
import { USER_ACCOUNT_REPOSITORY } from '../domain/user-account.repository';
import { BcryptHashService } from './services/bcrypt-hash.service';
import { TokenService } from './services/token.service';
import { UserLoginUseCase } from '../application/usecases/user-login.usecase';
import { UserAccountMapper } from './user-account-mapper';
import { USER_PASSWORD_HASHER } from '../application/service/user-password-hasher';
import { USER_TOKEN_SERVICE } from '../application/service/user-token-service';
import { RefreshTokenUseCase } from '../application/usecases/refresh-token.usecase';

@Module({
  imports: [TypeOrmModule.forFeature([UserAccountEntity])],
  controllers: [AuthUserController],
  providers: [
    { provide: USER_ACCOUNT_REPOSITORY, useClass: UserAccountService },
    { provide: USER_PASSWORD_HASHER, useClass: BcryptHashService },
    { provide: USER_TOKEN_SERVICE, useClass: TokenService },
    AuthUserService,
    UserAccountMapper,
    UserRegisterUseCase,
    UserLoginUseCase,
    RefreshTokenUseCase,
  ],
})
export class AuthUserModule {}
