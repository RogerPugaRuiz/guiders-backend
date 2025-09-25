import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwksResponse, JwksService } from './jwks.service';

@ApiTags('JWKS')
@Controller('jwks')
export class JwksController {
  constructor(private readonly jwksService: JwksService) {}

  @ApiOperation({
    summary: 'Obtener JWKS público',
    description:
      'Devuelve el conjunto de claves públicas (JWKS) expuestas por el sistema para verificación de firmas JWT.',
  })
  @ApiResponse({ status: 200, description: 'JWKS actual', type: Object })
  @ApiResponse({ status: 500, description: 'Error al recuperar JWKS' })
  @Get()
  async getJwks(): Promise<JwksResponse> {
    return await this.jwksService.getJwks();
  }
}
