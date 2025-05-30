import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyTypeOrmEntity } from './features/company-management/infrastructure/persistence/entity/company-typeorm.entity';
import { companyRepositoryProvider } from './features/company-management/infrastructure/persistence/impl/company.repository.impl';
import { CreateCompanyCommandHandler } from './features/company-management/application/commands/create-company-command.handler';
import { CreateCompanyWithAdminCommandHandler } from './features/company-management/application/commands/create-company-with-admin-command.handler';
import { CqrsModule } from '@nestjs/cqrs';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyTypeOrmEntity]), CqrsModule],
  controllers: [],
  providers: [
    companyRepositoryProvider,
    CreateCompanyCommandHandler,
    CreateCompanyWithAdminCommandHandler,
  ],
})
export class CompanyModule {}
