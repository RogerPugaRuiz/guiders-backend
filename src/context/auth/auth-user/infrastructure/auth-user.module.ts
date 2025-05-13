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
import { TokenVerifyService } from 'src/context/shared/infrastructure/token-verify.service';
import { HttpModule } from '@nestjs/axios';
import { FindOneUserByIdQueryHandler } from '../application/read/find-one-user-by-id.query-handler';
import { InviteTypeOrmEntity } from './persistence/entity/invite-typeorm.entity';
import { InviteRepositoryImpl } from './persistence/impl/invite.repository.impl';
import { INVITE_REPOSITORY } from '../domain/invite.repository';
import { CreateInviteCommandHandler } from '../application/commands/create-invite-command.handler';
import { CreateAdminOnCompanyCreatedWithAdminEventHandler } from '../application/events/create-admin-on-company-created-with-admin-event.handler';
import { CreateInviteOnCompanyCreatedWithAdminEventHandler } from '../application/events/create-invite-on-company-created-with-admin-event.handler';
import { EMAIL_SENDER_SERVICE } from 'src/context/shared/domain/email/email-sender.service';
import { EtherealEmailSenderService } from 'src/context/shared/infrastructure/email/ethereal-email-sender.service';
import { CqrsModule } from '@nestjs/cqrs';
import { MockEmailSenderService } from 'src/context/shared/infrastructure/email/mock-email-sender.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserAccountEntity, InviteTypeOrmEntity]),
    HttpModule,
    CqrsModule,
  ],
  controllers: [AuthUserController],
  providers: [
    { provide: USER_ACCOUNT_REPOSITORY, useClass: UserAccountService },
    { provide: USER_PASSWORD_HASHER, useClass: BcryptHashService },
    { provide: USER_TOKEN_SERVICE, useClass: TokenService },
    { provide: INVITE_REPOSITORY, useClass: InviteRepositoryImpl },
    { provide: EMAIL_SENDER_SERVICE, useClass: MockEmailSenderService },
    AuthUserService,
    UserAccountMapper,
    UserRegisterUseCase,
    UserLoginUseCase,
    RefreshTokenUseCase,
    TokenVerifyService,
    // handlers
    FindOneUserByIdQueryHandler,
    CreateInviteCommandHandler,
    CreateAdminOnCompanyCreatedWithAdminEventHandler,
    CreateInviteOnCompanyCreatedWithAdminEventHandler,
  ],
})
export class AuthUserModule {}
