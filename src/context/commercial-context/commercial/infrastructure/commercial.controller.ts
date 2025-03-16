import { Body, Controller, Param, Put } from '@nestjs/common';
import { CommercialService } from './commercial.service';

@Controller('commercial')
export class CommercialController {
  constructor(private readonly commercialService: CommercialService) {}

  @Put(':id/api-keys')
  async assignApiKey(
    @Param('id') commercialId: string,
    @Body('apiKeys') apiKeys: string[],
  ): Promise<string> {
    return this.commercialService.assignApiKeys(commercialId, apiKeys);
  }
}
