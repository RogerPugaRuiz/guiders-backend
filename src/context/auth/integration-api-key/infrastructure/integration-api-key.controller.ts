import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AuthGuard,
  AuthenticatedRequest,
} from 'src/context/shared/infrastructure/guards/auth.guard';
import {
  RolesGuard,
  RequiredRoles,
} from 'src/context/shared/infrastructure/guards/role.guard';
import {
  ApiAuthErrors,
  ApiInternalServerError,
  ApiNotFoundError,
} from 'src/context/shared/infrastructure/swagger';
import { CreateIntegrationApiKeyCommandHandler } from '../application/commands/create-integration-api-key.command-handler';
import { RevokeIntegrationApiKeyCommandHandler } from '../application/commands/revoke-integration-api-key.command-handler';
import { ListIntegrationApiKeysQueryHandler } from '../application/queries/list-integration-api-keys.query-handler';
import { CreateIntegrationApiKeyCommand } from '../application/commands/create-integration-api-key.command';
import { RevokeIntegrationApiKeyCommand } from '../application/commands/revoke-integration-api-key.command';
import { ListIntegrationApiKeysQuery } from '../application/queries/list-integration-api-keys.query';
import {
  CreateIntegrationApiKeyDto,
  IntegrationApiKeyCreatedResponseDto,
  IntegrationApiKeyListItemDto,
} from './dtos/integration-api-key.dto';
import {
  IntegrationApiKeyNotFoundError,
  IntegrationApiKeyAlreadyRevokedError,
} from '../domain/errors/integration-api-key.errors';
import { NotFoundException, ConflictException } from '@nestjs/common';

@ApiTags('integration-api-keys')
@ApiAuthErrors()
@ApiInternalServerError()
@Controller('integration-api-keys')
@UseGuards(AuthGuard, RolesGuard)
@RequiredRoles('admin')
@ApiBearerAuth()
@ApiAuthErrors()
export class IntegrationApiKeyController {
  constructor(
    private readonly createHandler: CreateIntegrationApiKeyCommandHandler,
    private readonly revokeHandler: RevokeIntegrationApiKeyCommandHandler,
    private readonly listHandler: ListIntegrationApiKeysQueryHandler,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Crear API Key de integración',
    description:
      'Genera una nueva API Key para llamar a la API pública de Guiders desde un backend externo. El token solo se devuelve una vez: guárdalo de forma segura.',
  })
  @ApiResponse({
    status: 201,
    description: 'API Key creada. El token solo se muestra en esta respuesta.',
    type: IntegrationApiKeyCreatedResponseDto,
  })
  async create(
    @Body() dto: CreateIntegrationApiKeyDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<IntegrationApiKeyCreatedResponseDto> {
    const companyId = req.user?.companyId;
    if (!companyId)
      throw new UnauthorizedException('Token sin companyId asociado');

    const result = await this.createHandler.execute(
      new CreateIntegrationApiKeyCommand(companyId, dto.name, dto.environment),
    );

    if (result.isErr()) throw result.error;

    const data = result.unwrap();
    return {
      id: data.id,
      name: data.name,
      token: data.plainToken,
      tokenPrefix: data.tokenPrefix,
      environment: data.environment,
      createdAt: data.createdAt,
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Listar API Keys de integración',
    description:
      'Devuelve todas las API Keys de integración de la compañía. No incluye los tokens completos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Listado de API Keys',
    type: [IntegrationApiKeyListItemDto],
  })
  async list(
    @Req() req: AuthenticatedRequest,
  ): Promise<IntegrationApiKeyListItemDto[]> {
    const companyId = req.user?.companyId;
    if (!companyId)
      throw new UnauthorizedException('Token sin companyId asociado');

    return this.listHandler.execute(new ListIntegrationApiKeysQuery(companyId));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revocar API Key de integración',
    description: 'Revoca una API Key de integración. No se puede deshacer.',
  })
  @ApiResponse({ status: 204, description: 'API Key revocada' })
  @ApiNotFoundError('ApiKey', 'API Key no encontrada')
  @ApiResponse({ status: 409, description: 'La API Key ya está revocada' })
  async revoke(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    const companyId = req.user?.companyId;
    if (!companyId)
      throw new UnauthorizedException('Token sin companyId asociado');

    const result = await this.revokeHandler.execute(
      new RevokeIntegrationApiKeyCommand(id, companyId),
    );

    if (result.isErr()) {
      const error = result.error;
      if (error instanceof IntegrationApiKeyNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof IntegrationApiKeyAlreadyRevokedError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }
}
