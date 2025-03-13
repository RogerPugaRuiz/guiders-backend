import { Controller, Get, Param, Post } from '@nestjs/common';
import { OpenSearchService } from '../open-search.service';

@Controller('open-search')
export class OpenSearchController {
  constructor(private readonly openSearchService: OpenSearchService) {}

  @Post(':index')
  async createDocument(@Param('index') index: string): Promise<void> {
    const client = this.openSearchService.getClient();
    const body = {
      title: 'Test',
      tags: ['test'],
      published: true,
      published_at: new Date(),
    };
    await client.index({
      index,
      body,
    });
  }

  @Get(':index')
  async search(@Param('index') index: string): Promise<any> {
    const client = this.openSearchService.getClient();
    const { body } = await client.search({
      index,
    });
    return body.hits.hits;
  }
}
