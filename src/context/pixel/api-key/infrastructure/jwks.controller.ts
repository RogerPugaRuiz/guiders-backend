import { Controller, Get } from '@nestjs/common';
import { Key } from './jwks-key';
import { JwksService } from './jwks.service';

@Controller('jwks')
export class JwksController {
  constructor(private readonly jwksService: JwksService) {}

  @Get()
  async getJwks(): Promise<Key[]> {
    return await this.jwksService.getJwks();
  }
}
