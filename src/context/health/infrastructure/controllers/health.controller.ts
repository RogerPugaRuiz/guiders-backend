import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { GetHealthQuery } from '../../application/queries/get-health.query';
import { HealthResponseDto } from '../../application/dtos/health-response.dto';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Health check endpoint',
    description:
      'Verifica el estado de salud de la aplicación y sus conexiones a bases de datos. ' +
      'Retorna 200 si la aplicación está healthy o degraded, 503 si está unhealthy.',
  })
  @ApiResponse({
    status: 200,
    description: 'Aplicación healthy o degraded',
  })
  @ApiResponse({
    status: 503,
    description: 'Aplicación unhealthy (1+ bases de datos desconectadas)',
  })
  async getHealth(@Res() res: Response) {
    const health = await this.queryBus.execute<
      GetHealthQuery,
      HealthResponseDto
    >(new GetHealthQuery());

    const statusCode =
      health.status === 'unhealthy'
        ? HttpStatus.SERVICE_UNAVAILABLE
        : HttpStatus.OK;

    return res.status(statusCode).json(health);
  }
}
