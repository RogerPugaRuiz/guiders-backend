/**
 * Controller para gestión de configuración de LLM
 */

import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Inject } from '@nestjs/common';
import { DualAuthGuard } from 'src/context/shared/infrastructure/guards/dual-auth.guard';
import { RolesGuard } from 'src/context/shared/infrastructure/guards/role.guard';
import { Roles } from 'src/context/shared/infrastructure/roles.decorator';
import {
  ILlmConfigRepository,
  LLM_CONFIG_REPOSITORY,
} from '../../domain/llm-config.repository';
import { LlmSiteConfig } from '../../domain/value-objects/llm-site-config';
import {
  LlmConfigResponseDto,
  UpdateLlmConfigDto,
  CreateLlmConfigDto,
  LlmModelsListResponseDto,
  LlmProviderDto,
} from '../../application/dtos/llm-config.dto';

@ApiTags('LLM Configuration')
@Controller('v2/llm/config')
@UseGuards(DualAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiCookieAuth()
export class LlmConfigController {
  private readonly logger = new Logger(LlmConfigController.name);

  constructor(
    @Inject(LLM_CONFIG_REPOSITORY)
    private readonly configRepository: ILlmConfigRepository,
  ) {}

  /**
   * Lista de proveedores disponibles con sus modelos
   * Solo se incluyen proveedores activos (implementados)
   * Actualizado: Diciembre 2025
   */
  private readonly availableProviders: LlmProviderDto[] = [
    {
      id: 'groq',
      name: 'Groq',
      isActive: true,
      models: [
        {
          id: 'llama-3.3-70b-versatile',
          name: 'Llama 3.3 70B Versatile',
          provider: 'groq',
          description:
            'Modelo versátil de Meta con 70B parámetros. Excelente para conversaciones y tareas generales.',
          maxContextTokens: 128000,
          isActive: true,
          isDefault: true,
        },
        {
          id: 'llama-3.1-8b-instant',
          name: 'Llama 3.1 8B Instant',
          provider: 'groq',
          description:
            'Modelo ligero y rápido con 8B parámetros. Ideal para respuestas instantáneas con baja latencia.',
          maxContextTokens: 128000,
          isActive: true,
        },
        {
          id: 'meta-llama/llama-4-scout-17b-16e-instruct',
          name: 'Llama 4 Scout 17B',
          provider: 'groq',
          description:
            'Modelo Llama 4 de Meta optimizado para instrucciones. 17B parámetros con arquitectura eficiente.',
          maxContextTokens: 128000,
          isActive: true,
        },
        {
          id: 'meta-llama/llama-4-maverick-17b-128e-instruct',
          name: 'Llama 4 Maverick 17B',
          provider: 'groq',
          description:
            'Modelo Llama 4 de Meta con capacidades avanzadas. 17B parámetros, mayor contexto.',
          maxContextTokens: 128000,
          isActive: true,
        },
        {
          id: 'qwen/qwen3-32b',
          name: 'Qwen 3 32B',
          provider: 'groq',
          description:
            'Modelo de Alibaba Cloud con 32B parámetros. Excelente para razonamiento y tareas complejas.',
          maxContextTokens: 32768,
          isActive: true,
        },
        {
          id: 'moonshotai/kimi-k2-instruct',
          name: 'Kimi K2 Instruct',
          provider: 'groq',
          description:
            'Modelo de Moonshot AI optimizado para seguir instrucciones. Buena calidad de respuestas.',
          maxContextTokens: 128000,
          isActive: true,
        },
      ],
    },
  ];

  @Get('providers')
  @Roles(['admin', 'superadmin'])
  @ApiOperation({ summary: 'Obtener lista de proveedores LLM disponibles con sus modelos' })
  @ApiResponse({
    status: 200,
    description: 'Lista de proveedores con sus modelos',
    type: LlmModelsListResponseDto,
  })
  async getAvailableProviders(): Promise<LlmModelsListResponseDto> {
    this.logger.debug('Obteniendo lista de proveedores disponibles');

    return {
      providers: this.availableProviders,
      defaultModel: 'llama-3.3-70b-versatile',
      defaultProvider: 'groq',
    };
  }

  @Get(':siteId')
  @Roles(['admin', 'superadmin'])
  @ApiOperation({ summary: 'Obtener configuración LLM de un sitio' })
  @ApiParam({ name: 'siteId', description: 'ID del sitio' })
  @ApiResponse({
    status: 200,
    description: 'Configuración encontrada',
    type: LlmConfigResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Configuración no encontrada' })
  async getConfig(
    @Param('siteId') siteId: string,
  ): Promise<LlmConfigResponseDto> {
    this.logger.debug(`Obteniendo configuración para sitio ${siteId}`);

    const result = await this.configRepository.findBySiteId(siteId);

    if (result.isErr()) {
      // Si no existe, devolver configuración por defecto
      const defaultConfig = LlmSiteConfig.createDefault(siteId, '');
      return this.toResponseDto(defaultConfig);
    }

    return this.toResponseDto(result.unwrap());
  }

  @Post()
  @Roles(['admin', 'superadmin'])
  @ApiOperation({ summary: 'Crear configuración LLM para un sitio' })
  @ApiResponse({
    status: 201,
    description: 'Configuración creada',
    type: LlmConfigResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async createConfig(
    @Body() dto: CreateLlmConfigDto,
  ): Promise<LlmConfigResponseDto> {
    this.logger.debug(`Creando configuración para sitio ${dto.siteId}`);

    const config = LlmSiteConfig.create({
      siteId: dto.siteId,
      companyId: dto.companyId,
      aiAutoResponseEnabled: dto.aiAutoResponseEnabled ?? true,
      aiSuggestionsEnabled: dto.aiSuggestionsEnabled ?? true,
      aiRespondWithCommercial: dto.aiRespondWithCommercial ?? false,
      preferredProvider: dto.preferredProvider ?? 'groq',
      preferredModel: dto.preferredModel ?? 'llama-3.3-70b-versatile',
      customSystemPrompt: dto.customSystemPrompt,
      maxResponseTokens: dto.maxResponseTokens ?? 500,
      temperature: dto.temperature ?? 0.7,
      responseDelayMs: dto.responseDelayMs ?? 1000,
    });

    const saveResult = await this.configRepository.save(config);

    if (saveResult.isErr()) {
      throw new Error(saveResult.error.message);
    }

    return this.toResponseDto(config);
  }

  @Patch(':siteId')
  @Roles(['admin', 'superadmin'])
  @ApiOperation({ summary: 'Actualizar configuración LLM de un sitio' })
  @ApiParam({ name: 'siteId', description: 'ID del sitio' })
  @ApiResponse({
    status: 200,
    description: 'Configuración actualizada',
    type: LlmConfigResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Configuración no encontrada' })
  async updateConfig(
    @Param('siteId') siteId: string,
    @Body() dto: UpdateLlmConfigDto,
  ): Promise<LlmConfigResponseDto> {
    this.logger.debug(`Actualizando configuración para sitio ${siteId}`);

    // Obtener configuración existente o crear una por defecto
    let config: LlmSiteConfig;
    const existingResult = await this.configRepository.findBySiteId(siteId);

    if (existingResult.isOk()) {
      config = existingResult.unwrap();
    } else {
      // Crear configuración por defecto si no existe
      config = LlmSiteConfig.createDefault(siteId, '');
    }

    // Aplicar actualizaciones
    const updatedConfig = config.update({
      aiAutoResponseEnabled: dto.aiAutoResponseEnabled,
      aiSuggestionsEnabled: dto.aiSuggestionsEnabled,
      aiRespondWithCommercial: dto.aiRespondWithCommercial,
      preferredProvider: dto.preferredProvider,
      preferredModel: dto.preferredModel,
      customSystemPrompt: dto.customSystemPrompt,
      maxResponseTokens: dto.maxResponseTokens,
      temperature: dto.temperature,
      responseDelayMs: dto.responseDelayMs,
    });

    const saveResult = await this.configRepository.save(updatedConfig);

    if (saveResult.isErr()) {
      throw new Error(saveResult.error.message);
    }

    return this.toResponseDto(updatedConfig);
  }

  @Delete(':siteId')
  @Roles(['admin', 'superadmin'])
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar configuración LLM de un sitio' })
  @ApiParam({ name: 'siteId', description: 'ID del sitio' })
  @ApiResponse({ status: 204, description: 'Configuración eliminada' })
  @ApiResponse({ status: 404, description: 'Configuración no encontrada' })
  async deleteConfig(@Param('siteId') siteId: string): Promise<void> {
    this.logger.debug(`Eliminando configuración para sitio ${siteId}`);

    const result = await this.configRepository.delete(siteId);

    if (result.isErr()) {
      throw new Error(result.error.message);
    }
  }

  /**
   * Convierte LlmSiteConfig a DTO de respuesta
   */
  private toResponseDto(config: LlmSiteConfig): LlmConfigResponseDto {
    const primitives = config.toPrimitives();

    return {
      siteId: primitives.siteId,
      companyId: primitives.companyId,
      aiAutoResponseEnabled: primitives.aiAutoResponseEnabled,
      aiSuggestionsEnabled: primitives.aiSuggestionsEnabled,
      aiRespondWithCommercial: primitives.aiRespondWithCommercial,
      preferredProvider: primitives.preferredProvider,
      preferredModel: primitives.preferredModel,
      customSystemPrompt: primitives.customSystemPrompt,
      maxResponseTokens: primitives.maxResponseTokens,
      temperature: primitives.temperature,
      responseDelayMs: primitives.responseDelayMs,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    };
  }
}
