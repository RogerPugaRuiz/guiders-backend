import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  ServiceUnavailableException,
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
import {
  EmbedTokenGuard,
  EmbedTokenRequest,
} from '../guards/embed-token.guard';
import { CreateEmbedTokenCommandHandler } from '../../application/commands/create-embed-token.command-handler';
import { CreateEmbedTokenCommand } from '../../application/commands/create-embed-token.command';
import { RefreshEmbedTokenCommandHandler } from '../../application/commands/refresh-embed-token.command-handler';
import { RefreshEmbedTokenCommand } from '../../application/commands/refresh-embed-token.command';
import {
  CreateEmbedTokenDto,
  CreateEmbedTokenResponseDto,
  EmbedTokenForbiddenResponseDto,
} from '../../application/dtos/create-embed-token.dto';
import {
  RefreshEmbedTokenDto,
  RefreshEmbedTokenResponseDto,
} from '../../application/dtos/refresh-embed-token.dto';
import {
  EmbedTokenForbiddenError,
  EmbedTokenExpiredError,
  EmbedTokenInvalidError,
  EmbedTokenUserMismatchError,
  EmbedTokenError,
} from '../../domain/errors/embed-token.errors';

@ApiTags('Integration Embed')
@Controller('v2/integration/embed')
@ApiBearerAuth()
@ApiCookieAuth('access_token')
export class EmbedController {
  private readonly logger = new Logger(EmbedController.name);

  constructor(
    private readonly createEmbedTokenHandler: CreateEmbedTokenCommandHandler,
    private readonly refreshEmbedTokenHandler: RefreshEmbedTokenCommandHandler,
  ) {}

  @Post('start')
  @HttpCode(HttpStatus.OK)
  @UseGuards(IntegrationApiKeyGuard)
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
  @ApiResponse({
    status: 503,
    description: 'Servicio de tokens o white-label config no disponible (Mongo/Redis caído)',
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
      // Unknown error (Redis down, etc.) — 503
      throw new ServiceUnavailableException({
        code: 'EMBED_SERVICE_UNAVAILABLE',
        message: 'Servicio de tokens temporalmente no disponible, reintentar',
        statusCode: 503,
      });
    }

    const issued = result.unwrap();
    return {
      token: issued.token,
      expiresAt: issued.expiresAt,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(EmbedTokenGuard)
  @ApiOperation({
    summary: 'Refrescar embed token antes de expirar',
    description:
      'El iframe llama este endpoint con `Authorization: Bearer <token>` antes de que el token expire (8h) para extender la sesión. ' +
      'El token viejo se elimina atómicamente (Lua script) y se emite uno nuevo. ' +
      'Si el body incluye `userId` y difiere del token → 403.',
  })
  @ApiResponse({
    status: 200,
    description: 'Embed token refrescado',
    type: RefreshEmbedTokenResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'DTO inválido (userId no es UUID si se proporciona)',
  })
  @ApiResponse({
    status: 401,
    description:
      'Token expirado, revocado, o con formato/contenido inválido. Códigos: EMBED_TOKEN_MISSING (header ausente), EMBED_TOKEN_INVALID (formato o contenido), EMBED_TOKEN_EXPIRED (no existe en Redis o tenant desactivó embed)',
  })
  @ApiResponse({
    status: 403,
    description: 'UserId del body no coincide con el del token (código EMBED_TOKEN_USER_MISMATCH)',
  })
  @ApiResponse({
    status: 503,
    description: 'Servicio de tokens o white-label config no disponible (Mongo/Redis caído)',
  })
  async refresh(
    @Body() dto: RefreshEmbedTokenDto,
    @Req() req: EmbedTokenRequest,
  ): Promise<RefreshEmbedTokenResponseDto> {
    const result = await this.refreshEmbedTokenHandler.execute(
      new RefreshEmbedTokenCommand(
        req.embedToken as string,
        dto.userId,
        // apiKeyCompanyId solo presente si el IntegrationApiKeyGuard corrió antes
        (req as unknown as { integrationApiKey?: { companyId: string } })
          .integrationApiKey?.companyId,
      ),
    );

    if (result.isErr()) {
      const errValue = result.error;
      if (errValue instanceof EmbedTokenExpiredError) {
        throw new UnauthorizedException({
          code: errValue.code,
          message: errValue.message,
          statusCode: 401,
        });
      }
      if (errValue instanceof EmbedTokenInvalidError) {
        throw new UnauthorizedException({
          code: errValue.code,
          message: errValue.message,
          statusCode: 401,
        });
      }
      if (errValue instanceof EmbedTokenUserMismatchError) {
        throw new ForbiddenException({
          code: errValue.code,
          message: errValue.message,
          statusCode: 403,
        });
      }
      // Mongo/Redis down (EmbedTokenError genérico) → 503
      throw new ServiceUnavailableException({
        code: 'EMBED_SERVICE_UNAVAILABLE',
        message: 'Servicio de tokens temporalmente no disponible, reintentar',
        statusCode: 503,
      });
    }

    const issued = result.unwrap();
    return {
      token: issued.token,
      expiresAt: issued.expiresAt,
    };
  }
}
