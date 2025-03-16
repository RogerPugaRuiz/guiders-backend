import { Controller, Get } from '@nestjs/common';
import { JwksResponse, JwksService } from './jwks.service';

@Controller('jwks')
export class JwksController {
  constructor(private readonly jwksService: JwksService) {}

  @Get()
  async getJwks(): Promise<JwksResponse> {
    return await this.jwksService.getJwks();
  }
}
