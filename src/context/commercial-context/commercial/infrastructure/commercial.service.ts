import { Injectable } from '@nestjs/common';

@Injectable()
export class CommercialService {
  async assignApiKeys(
    commercialId: string,
    apiKeys: string[],
  ): Promise<string> {
    // Logic to assign an API key to a commercial
    return Promise.resolve('API key assigned');
  }
}
