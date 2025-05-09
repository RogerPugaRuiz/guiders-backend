import { Module } from '@nestjs/common';
import { VISITOR_REPOSITORY } from '../domain/visitor.repository';
import { TypeOrmVisitorAdapter } from './persistence/type-orm-visitor.adapter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisitorTypeOrmEntity } from './persistence/visitor-typeorm.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VisitorTypeOrmEntity])],
  providers: [{ provide: VISITOR_REPOSITORY, useClass: TypeOrmVisitorAdapter }],
})
export class VisitorsModule {}
