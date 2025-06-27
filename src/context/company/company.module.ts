import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyTypeOrmEntity } from './infrastructure/persistence/entity/company-typeorm.entity';
import { companyRepositoryProvider } from './infrastructure/persistence/impl/company.repository.impl';
import { CreateCompanyCommandHandler } from './application/commands/create-company-command.handler';
import { CreateCompanyWithAdminCommandHandler } from './application/commands/create-company-with-admin-command.handler';
import { FindCompanyByDomainQueryHandler } from './application/queries/find-company-by-domain.query-handler';
import { CqrsModule } from '@nestjs/cqrs';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyTypeOrmEntity]), CqrsModule],
  controllers: [],
  providers: [
    companyRepositoryProvider,
    CreateCompanyCommandHandler,
    CreateCompanyWithAdminCommandHandler,
    FindCompanyByDomainQueryHandler,
  ],
})
export class CompanyModule {}
