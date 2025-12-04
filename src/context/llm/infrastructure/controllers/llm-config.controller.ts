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
  ApiParam,
} from '@nestjs/swagger';
import { Inject } from '@nestjs/common';
import { AuthGuard } from 'src/context/shared/infrastructure/guards/auth.guard';
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
} from '../../application/dtos/llm-config.dto';

@ApiTags('LLM Configuration')
@Controller('api/v2/llm/config')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
export class LlmConfigController {
  private readonly logger = new Logger(LlmConfigController.name);

  constructor(
    @Inject(LLM_CONFIG_REPOSITORY)
    private readonly configRepository: ILlmConfigRepository,
  ) {}

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
