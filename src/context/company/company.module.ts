import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { CompanyTypeOrmEntity } from './infrastructure/persistence/entity/company-typeorm.entity';
import { companyRepositoryProvider } from './infrastructure/persistence/impl/company.repository.impl';
import { CreateCompanyCommandHandler } from './application/commands/create-company-command.handler';
import { CreateCompanyWithAdminCommandHandler } from './application/commands/create-company-with-admin-command.handler';
import { FindCompanyByDomainQueryHandler } from './application/queries/find-company-by-domain.query-handler';
import { ResolveSiteByHostQueryHandler } from './application/queries/resolve-site-by-host.query-handler';
import { GetCompanySitesQueryHandler } from './application/queries/get-company-sites.query-handler';
import { CompanyController } from './infrastructure/controllers/company.controller';
import { CqrsModule } from '@nestjs/cqrs';
import { TokenVerifyService } from '../shared/infrastructure/token-verify.service';
import { BffSessionAuthService } from '../shared/infrastructure/services/bff-session-auth.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CompanyTypeOrmEntity]),
    CqrsModule,
    HttpModule,
    JwtModule.register({}),
    ConfigModule,
  ],
  controllers: [CompanyController],
  providers: [
    companyRepositoryProvider,
    CreateCompanyCommandHandler,
    CreateCompanyWithAdminCommandHandler,
    FindCompanyByDomainQueryHandler,
    ResolveSiteByHostQueryHandler,
    GetCompanySitesQueryHandler,
    // Servicios necesarios para DualAuthGuard (sin VisitorSessionAuthService para evitar dependencias complejas)
    TokenVerifyService,
    BffSessionAuthService,
  ],
  exports: [companyRepositoryProvider],
})
export class CompanyModule {}
