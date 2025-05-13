import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyTypeOrmEntity } from './infrastructure/persistence/entity/company-typeorm.entity';
import { companyRepositoryProvider } from './infrastructure/persistence/impl/company.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyTypeOrmEntity])],
  controllers: [],
  providers: [companyRepositoryProvider],
})
export class CompanyModule {}
