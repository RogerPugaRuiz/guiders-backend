import { Body, Controller, Post } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';

@Controller('api-keys')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post('create')
  async createApiKey(
    @Body('domain') domain: string,
    @Body('companyId') companyId: string,
  ): Promise<{ apiKey: string }> {
    return await this.apiKeyService.createApiKeyForDomain(domain, companyId);
  }
}
