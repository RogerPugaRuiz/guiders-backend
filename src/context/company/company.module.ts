import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyTypeOrmEntity } from './infrastructure/persistence/entity/company-typeorm.entity';
import { companyRepositoryProvider } from './infrastructure/persistence/impl/company.repository.impl';
import { CreateCompanyCommandHandler } from './application/commands/create-company-command.handler';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyTypeOrmEntity])],
  controllers: [],
  providers: [companyRepositoryProvider, CreateCompanyCommandHandler],
})
export class CompanyModule {}
