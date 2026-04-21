import { Controller, Get } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PublicEndpoint } from 'src/context/shared/infrastructure/swagger';
import { JwksResponse, JwksService } from './jwks.service';
import { JwksResponseDto } from './dtos/jwks-response.dto';

@ApiTags('JWKS')
@Controller('jwks')
export class JwksController {
  constructor(private readonly jwksService: JwksService) {}

  @PublicEndpoint()
  @ApiOperation({
    summary: 'Obtener JWKS público',
    description:
      'Devuelve el conjunto de claves públicas (JWKS) expuestas por el sistema para verificación de firmas JWT. Endpoint público conforme al estándar RFC 7517.',
  })
  @ApiResponse({
    status: 200,
    description: 'JWKS actual con todas las claves públicas activas.',
    type: JwksResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Petición inválida.' })
  @ApiInternalServerErrorResponse({ description: 'Error al recuperar JWKS' })
  @Get()
  async getJwks(): Promise<JwksResponse> {
    return await this.jwksService.getJwks();
  }
}
