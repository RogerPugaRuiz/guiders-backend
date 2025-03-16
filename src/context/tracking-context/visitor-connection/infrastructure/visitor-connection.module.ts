import { Module } from '@nestjs/common';
import { VISITOR_CONNECTION_REPOSITORY } from '../domain/visitor-connection.repository';
import { MemoryVisitorConnectionService } from './memory-visitor-connection.service';

@Module({
  providers: [
    {
      provide: VISITOR_CONNECTION_REPOSITORY,
      useClass: MemoryVisitorConnectionService,
    },
  ],
})
export class VisitorConnectionModule {}
