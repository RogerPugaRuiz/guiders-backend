import { Module } from '@nestjs/common';
import { VISITOR_REPOSITORY } from '../domain/visitor.repository';
import { TypeOrmVisitorAdapter } from './persistence/type-orm-visitor.adapter';

@Module({
  providers: [{ provide: VISITOR_REPOSITORY, useClass: TypeOrmVisitorAdapter }],
})
export class VisitorsModule {}
