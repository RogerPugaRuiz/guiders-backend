/**
 * Controller HTTP para el flujo de embed B2B.
 *
 * Endpoints:
 *  - POST /v2/integration/embed/start
 *      Header: `x-api-key: gdr_live_xxx` (o `gdr_test_xxx`)
 *      Body:   `{ userId, companyId }`
 *
 * Flujo:
 *  1. `IntegrationApiKeyGuard` valida la API key e inyecta
 *     `req.integrationApiKey = { id, companyId, environment }`
 *  2. Controller verifica que `companyId` de la API key coincide con
 *     el `companyId` del body (tenant mismatch → 403).
 *  3. CommandHandler hace las validaciones restantes y emite el token.
 */

import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  IntegrationApiKeyGuard,
  IntegrationApiKeyRequest,
} from '../integration-api-key.guard';
import { CreateEmbedTokenCommandHandler } from '../../application/commands/create-embed-token.command-handler';
import { CreateEmbedTokenCommand } from '../../application/commands/create-embed-token.command';
import {
  CreateEmbedTokenDto,
  CreateEmbedTokenResponseDto,
  EmbedTokenForbiddenResponseDto,
} from '../../application/dtos/create-embed-token.dto';
import { EmbedTokenForbiddenError } from '../../domain/errors/embed-token.errors';

@ApiTags('Integration Embed')
@Controller('v2/integration/embed')
@UseGuards(IntegrationApiKeyGuard)
@ApiBearerAuth()
@ApiCookieAuth('access_token')
export class EmbedController {
  constructor(
    private readonly createEmbedTokenHandler: CreateEmbedTokenCommandHandler,
  ) {}

  @Post('start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Solicitar embed token para un usuario',
    description:
      'Autentica al integrador mediante `x-api-key` y emite un embed token opaco (256-bit base64url) con TTL 8h. ' +
      'El integrador envía este token al iframe de Guiders para autenticar al usuario final.',
  })
  @ApiResponse({
    status: 200,
    description: 'Embed token emitido',
    type: CreateEmbedTokenResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'DTO inválido (userId/companyId no son UUID)',
  })
  @ApiResponse({
    status: 401,
    description: 'API key de integración inválida o revocada',
  })
  @ApiResponse({
    status: 403,
    description: 'Embed deshabilitado para la empresa, usuario no pertenece, o tenant mismatch',
    type: EmbedTokenForbiddenResponseDto,
  })
  async start(
    @Body() dto: CreateEmbedTokenDto,
    @Req() req: IntegrationApiKeyRequest,
  ): Promise<CreateEmbedTokenResponseDto> {
    // Tenant mismatch check: API key companyId === body companyId
    if (req.integrationApiKey.companyId !== dto.companyId) {
      throw new ForbiddenException({
        code: 'EMBED_TENANT_MISMATCH',
        message:
          'El companyId del body no coincide con el de la API Key',
        statusCode: 403,
      });
    }

    const result = await this.createEmbedTokenHandler.execute(
      new CreateEmbedTokenCommand(dto.userId, dto.companyId),
    );

    if (result.isErr()) {
      const errValue = result.error;
      if (errValue instanceof EmbedTokenForbiddenError) {
        throw new ForbiddenException({
          code: errValue.code,
          message: errValue.message,
          statusCode: 403,
        });
      }
      // Unknown error (Redis down, etc.) — preserve as 500 by rethrowing
      throw errValue;
    }

    const issued = result.unwrap();
    return {
      token: issued.token,
      expiresAt: issued.expiresAt,
    };
  }
}
