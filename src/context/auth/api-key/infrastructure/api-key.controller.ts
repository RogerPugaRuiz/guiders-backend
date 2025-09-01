import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import {
  AuthGuard,
  AuthenticatedRequest,
} from 'src/context/shared/infrastructure/guards/auth.guard';
import {
  RolesGuard,
  RequiredRoles,
} from 'src/context/shared/infrastructure/guards/role.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('API Keys')
@Controller('api-keys')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post('create')
  @ApiOperation({
    summary: 'Crear (o reutilizar) API Key para un dominio',
    description:
      'Genera una nueva API Key asociada a un dominio y compañía. Si el dominio ya tiene una API Key se reutiliza.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        domain: { type: 'string', example: 'example.com' },
        companyId: {
          type: 'string',
          format: 'uuid',
          example: 'b0a4c9f2-2f6a-4c44-9c3e-8f0a5d2a1e11',
        },
      },
      required: ['domain', 'companyId'],
    },
  })
  @ApiResponse({ status: 201, description: 'API Key creada o reutilizada' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  async createApiKey(
    @Body('domain') domain: string,
    @Body('companyId') companyId: string,
  ): Promise<{ apiKey: string }> {
    return await this.apiKeyService.createApiKeyForDomain(domain, companyId);
  }

  @Get('company')
  @UseGuards(AuthGuard, RolesGuard)
  @RequiredRoles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar API Keys de la compañía',
    description:
      'Devuelve las API Keys asociadas a la compañía incluida en el token JWT (requiere rol admin).',
  })
  @ApiResponse({ status: 200, description: 'Listado obtenido correctamente' })
  @ApiResponse({ status: 401, description: 'Token inválido o sin companyId' })
  @ApiResponse({ status: 403, description: 'Rol insuficiente (no admin)' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  async listCompanyApiKeys(@Req() req: AuthenticatedRequest) {
    const companyId = req.user?.companyId;
    if (!companyId) {
      throw new UnauthorizedException('Token sin companyId asociado');
    }
    return await this.apiKeyService.listCompanyApiKeys(companyId);
  }
}
