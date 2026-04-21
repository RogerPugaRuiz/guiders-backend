import { Controller, Get, Head, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';

import {
  ApiAuthErrors,
  PublicEndpoint,
} from './context/shared/infrastructure/swagger';
import { AppService } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @PublicEndpoint()
  @ApiOperation({
    summary: 'Mensaje de bienvenida',
    description:
      'Devuelve un mensaje de bienvenida básico del servicio. Útil como smoke test rápido para confirmar que la API responde.',
  })
  @ApiOkResponse({
    description: 'Mensaje de bienvenida en texto plano.',
    schema: { type: 'string', example: 'Hello World!' },
  })
  @ApiBadRequestResponse({ description: 'Petición inválida.' })
  @ApiInternalServerErrorResponse({
    description: 'Error interno del servidor.',
  })
  getHello(): string {
    return this.appService.getHello();
  }

  @Head('health')
  @PublicEndpoint()
  @ApiOperation({
    summary: 'Health check (HEAD)',
    description:
      'Endpoint ligero de health check. Responde 200 OK sin cuerpo. Pensado para probes de orquestadores (Kubernetes, load balancers) que solo necesitan verificar disponibilidad.',
  })
  @ApiOkResponse({ description: 'El servicio está disponible.' })
  @ApiBadRequestResponse({ description: 'Petición inválida.' })
  @ApiInternalServerErrorResponse({
    description: 'Error interno del servidor.',
  })
  healthCheck(): void {
    return;
  }

  @Get('websocket-test')
  @PublicEndpoint()
  @ApiOperation({
    summary: 'Página HTML de prueba para WebSocket',
    description:
      'Devuelve una página HTML estática que permite probar manualmente la conexión WebSocket en navegador. Recurso de desarrollo/diagnóstico.',
  })
  @ApiProduces('text/html')
  @ApiOkResponse({
    description: 'Documento HTML con cliente de prueba WebSocket.',
  })
  @ApiBadRequestResponse({ description: 'Petición inválida.' })
  @ApiInternalServerErrorResponse({
    description: 'Error interno del servidor.',
  })
  getWebSocketTest(@Res() res: Response) {
    const filePath = join(__dirname, '..', 'static', 'websocket-test.html');
    const content = readFileSync(filePath, 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.send(content);
  }

  @Get('protected')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiAuthErrors()
  @ApiOperation({
    summary: 'Endpoint de prueba protegido por JWT',
    description:
      'Endpoint de diagnóstico que requiere un JWT válido. Útil para verificar que la autenticación Bearer está correctamente configurada en el cliente.',
  })
  @ApiOkResponse({
    description: 'Token válido; acceso concedido.',
    schema: { type: 'string', example: 'This is a protected route' },
  })
  getProtected(): string {
    return 'This is a protected route';
  }
}
