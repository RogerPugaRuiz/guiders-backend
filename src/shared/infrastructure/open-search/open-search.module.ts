import { Module } from '@nestjs/common';
import { OpenSearchService } from './open-search.service';
import { OpenSearchController } from './tests/open-search.controller';

@Module({
  providers: [OpenSearchService],
  exports: [OpenSearchService],
  controllers: [OpenSearchController],
})
export class OpenSearchModule {}
