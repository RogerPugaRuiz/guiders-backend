/**
 * Controller para gestión de configuración White Label
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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Inject } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DualAuthGuard } from 'src/context/shared/infrastructure/guards/dual-auth.guard';
import { RolesGuard } from 'src/context/shared/infrastructure/guards/role.guard';
import { Roles } from 'src/context/shared/infrastructure/roles.decorator';
import {
  IWhiteLabelConfigRepository,
  WHITE_LABEL_CONFIG_REPOSITORY,
} from '../../domain/white-label-config.repository';
import {
  WhiteLabelConfig,
  ALLOWED_FONT_FAMILIES,
} from '../../domain/entities/white-label-config';
import {
  WhiteLabelConfigResponseDto,
  UpdateWhiteLabelConfigDto,
  UploadResponseDto,
  WhiteLabelDefaultsDto,
  FontFileDto,
} from '../../application/dtos/white-label-config.dto';
import { WhiteLabelFileUploadService } from '../services/white-label-file-upload.service';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

@ApiTags('White Label Configuration')
@Controller('v2/companies/:companyId/white-label')
@UseGuards(DualAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiCookieAuth()
export class WhiteLabelConfigController {
  private readonly logger = new Logger(WhiteLabelConfigController.name);

  constructor(
    @Inject(WHITE_LABEL_CONFIG_REPOSITORY)
    private readonly configRepository: IWhiteLabelConfigRepository,
    private readonly fileUploadService: WhiteLabelFileUploadService,
  ) {}

  // ========================================
  // CONFIGURATION ENDPOINTS
  // ========================================

  @Get('defaults')
  @Roles(['admin', 'superadmin'])
  @ApiOperation({ summary: 'Obtener valores por defecto de White Label' })
  @ApiResponse({
    status: 200,
    description: 'Valores por defecto',
    type: WhiteLabelDefaultsDto,
  })
  getDefaults(): WhiteLabelDefaultsDto {
    this.logger.debug('Obteniendo valores por defecto de White Label');

    return {
      colors: {
        primary: '#007bff',
        secondary: '#6c757d',
        background: '#ffffff',
        surface: '#f8f9fa',
        text: '#212529',
        textMuted: '#6c757d',
      },
      availableFonts: [...ALLOWED_FONT_FAMILIES],
      defaultFont: 'Inter',
    };
  }

  @Get()
  @Roles(['admin', 'superadmin', 'commercial'])
  @ApiOperation({ summary: 'Obtener configuración White Label de una empresa' })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Configuración encontrada',
    type: WhiteLabelConfigResponseDto,
  })
  @ApiResponse({
    status: 404,
    description:
      'Configuración no encontrada - se devuelven valores por defecto',
  })
  async getConfig(
    @Param('companyId') companyId: string,
  ): Promise<WhiteLabelConfigResponseDto> {
    this.logger.debug(
      `Obteniendo configuración White Label para empresa ${companyId}`,
    );

    const result = await this.configRepository.findByCompanyId(companyId);

    if (result.isErr()) {
      // Si no existe, devolver configuración por defecto
      const defaultConfig = WhiteLabelConfig.createDefault(
        Uuid.random().value,
        companyId,
        '',
      );
      return this.toResponseDto(defaultConfig);
    }

    return this.toResponseDto(result.unwrap());
  }

  @Patch()
  @Roles(['admin', 'superadmin'])
  @ApiOperation({ summary: 'Actualizar configuración White Label (upsert)' })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Configuración actualizada',
    type: WhiteLabelConfigResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async updateConfig(
    @Param('companyId') companyId: string,
    @Body() dto: UpdateWhiteLabelConfigDto,
  ): Promise<WhiteLabelConfigResponseDto> {
    this.logger.debug(
      `Actualizando configuración White Label para empresa ${companyId}`,
    );

    // Obtener configuración existente o crear una por defecto
    let config: WhiteLabelConfig;
    const existingResult =
      await this.configRepository.findByCompanyId(companyId);

    if (existingResult.isOk()) {
      config = existingResult.unwrap();
    } else {
      // Crear configuración por defecto si no existe
      config = WhiteLabelConfig.createDefault(
        Uuid.random().value,
        companyId,
        dto.branding?.brandName || '',
      );
    }

    // Aplicar actualizaciones
    const updatedConfig = config.update({
      colors: dto.colors,
      branding: dto.branding,
      typography: dto.typography,
      theme: dto.theme,
    });

    const saveResult = await this.configRepository.save(updatedConfig);

    if (saveResult.isErr()) {
      throw new BadRequestException(saveResult.error.message);
    }

    return this.toResponseDto(updatedConfig);
  }

  @Delete()
  @Roles(['admin', 'superadmin'])
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar/resetear configuración White Label' })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa' })
  @ApiResponse({ status: 204, description: 'Configuración eliminada' })
  async deleteConfig(@Param('companyId') companyId: string): Promise<void> {
    this.logger.debug(
      `Eliminando configuración White Label para empresa ${companyId}`,
    );

    // Obtener config existente para eliminar archivos asociados
    const existingResult =
      await this.configRepository.findByCompanyId(companyId);

    if (existingResult.isOk()) {
      const config = existingResult.unwrap();
      const primitives = config.toPrimitives();

      // Eliminar archivos del storage
      const filesToDelete: string[] = [];
      if (primitives.branding.logoUrl) {
        filesToDelete.push(primitives.branding.logoUrl);
      }
      if (primitives.branding.faviconUrl) {
        filesToDelete.push(primitives.branding.faviconUrl);
      }
      for (const font of primitives.typography.customFontFiles) {
        filesToDelete.push(font.url);
      }

      if (filesToDelete.length > 0) {
        await this.fileUploadService.deleteFiles(filesToDelete);
      }
    }

    // Eliminar de la base de datos (no lanza error si no existe)
    await this.configRepository.delete(companyId);
  }

  // ========================================
  // LOGO ENDPOINTS
  // ========================================

  @Post('logo')
  @Roles(['admin', 'superadmin'])
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir logo de la empresa' })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo de imagen (PNG, JPEG, SVG). Máximo 2MB.',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Logo subido correctamente',
    type: UploadResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Archivo inválido' })
  async uploadLogo(
    @Param('companyId') companyId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    this.logger.debug(`Subiendo logo para empresa ${companyId}`);

    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    // Subir archivo
    const url = await this.fileUploadService.uploadLogo(file, companyId);

    // Actualizar configuración
    await this.updateConfigWithLogoUrl(companyId, url);

    return { url };
  }

  @Delete('logo')
  @Roles(['admin', 'superadmin'])
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar logo de la empresa' })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa' })
  @ApiResponse({ status: 204, description: 'Logo eliminado' })
  @ApiResponse({ status: 404, description: 'No hay logo configurado' })
  async deleteLogo(@Param('companyId') companyId: string): Promise<void> {
    this.logger.debug(`Eliminando logo para empresa ${companyId}`);

    const existingResult =
      await this.configRepository.findByCompanyId(companyId);

    if (existingResult.isErr()) {
      throw new NotFoundException(
        'No existe configuración White Label para esta empresa',
      );
    }

    const config = existingResult.unwrap();
    const primitives = config.toPrimitives();

    if (!primitives.branding.logoUrl) {
      return; // No hay logo, nada que hacer
    }

    // Eliminar archivo del storage
    await this.fileUploadService.deleteFile(primitives.branding.logoUrl);

    // Actualizar configuración
    const updatedConfig = config.updateLogoUrl(null);
    await this.configRepository.save(updatedConfig);
  }

  // ========================================
  // FAVICON ENDPOINTS
  // ========================================

  @Post('favicon')
  @Roles(['admin', 'superadmin'])
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir favicon de la empresa' })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo de icono (PNG, ICO). Máximo 500KB.',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Favicon subido correctamente',
    type: UploadResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Archivo inválido' })
  async uploadFavicon(
    @Param('companyId') companyId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    this.logger.debug(`Subiendo favicon para empresa ${companyId}`);

    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    // Subir archivo
    const url = await this.fileUploadService.uploadFavicon(file, companyId);

    // Actualizar configuración
    await this.updateConfigWithFaviconUrl(companyId, url);

    return { url };
  }

  @Delete('favicon')
  @Roles(['admin', 'superadmin'])
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar favicon de la empresa' })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa' })
  @ApiResponse({ status: 204, description: 'Favicon eliminado' })
  @ApiResponse({ status: 404, description: 'No hay favicon configurado' })
  async deleteFavicon(@Param('companyId') companyId: string): Promise<void> {
    this.logger.debug(`Eliminando favicon para empresa ${companyId}`);

    const existingResult =
      await this.configRepository.findByCompanyId(companyId);

    if (existingResult.isErr()) {
      throw new NotFoundException(
        'No existe configuración White Label para esta empresa',
      );
    }

    const config = existingResult.unwrap();
    const primitives = config.toPrimitives();

    if (!primitives.branding.faviconUrl) {
      return; // No hay favicon, nada que hacer
    }

    // Eliminar archivo del storage
    await this.fileUploadService.deleteFile(primitives.branding.faviconUrl);

    // Actualizar configuración
    const updatedConfig = config.updateFaviconUrl(null);
    await this.configRepository.save(updatedConfig);
  }

  // ========================================
  // FONT ENDPOINTS
  // ========================================

  @Post('font')
  @Roles(['admin', 'superadmin'])
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir archivo de fuente personalizada' })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo de fuente (TTF, OTF, WOFF, WOFF2). Máximo 5MB.',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Fuente subida correctamente',
    type: FontFileDto,
  })
  @ApiResponse({ status: 400, description: 'Archivo inválido' })
  async uploadFont(
    @Param('companyId') companyId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<FontFileDto> {
    this.logger.debug(`Subiendo fuente para empresa ${companyId}`);

    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    // Subir archivo
    const fontFile = await this.fileUploadService.uploadFont(file, companyId);

    // Actualizar configuración
    await this.addFontToConfig(companyId, fontFile);

    return fontFile;
  }

  @Delete('font/:fileName')
  @Roles(['admin', 'superadmin'])
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar archivo de fuente específico' })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa' })
  @ApiParam({ name: 'fileName', description: 'Nombre del archivo de fuente' })
  @ApiResponse({ status: 204, description: 'Fuente eliminada' })
  @ApiResponse({ status: 404, description: 'Fuente no encontrada' })
  async deleteFont(
    @Param('companyId') companyId: string,
    @Param('fileName') fileName: string,
  ): Promise<void> {
    this.logger.debug(
      `Eliminando fuente ${fileName} para empresa ${companyId}`,
    );

    const existingResult =
      await this.configRepository.findByCompanyId(companyId);

    if (existingResult.isErr()) {
      throw new NotFoundException(
        'No existe configuración White Label para esta empresa',
      );
    }

    const config = existingResult.unwrap();
    const primitives = config.toPrimitives();

    // Buscar el archivo de fuente
    const fontFile = primitives.typography.customFontFiles.find(
      (f) => f.name === fileName,
    );

    if (!fontFile) {
      throw new NotFoundException(`No se encontró la fuente: ${fileName}`);
    }

    // Eliminar archivo del storage
    await this.fileUploadService.deleteFile(fontFile.url);

    // Actualizar configuración
    const updatedConfig = config.removeFontFile(fileName);
    await this.configRepository.save(updatedConfig);
  }

  @Delete('fonts')
  @Roles(['admin', 'superadmin'])
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar todas las fuentes personalizadas' })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa' })
  @ApiResponse({ status: 204, description: 'Todas las fuentes eliminadas' })
  async deleteAllFonts(@Param('companyId') companyId: string): Promise<void> {
    this.logger.debug(`Eliminando todas las fuentes para empresa ${companyId}`);

    const existingResult =
      await this.configRepository.findByCompanyId(companyId);

    if (existingResult.isErr()) {
      return; // No hay configuración, nada que hacer
    }

    const config = existingResult.unwrap();
    const primitives = config.toPrimitives();

    // Eliminar todos los archivos del storage
    const fontUrls = primitives.typography.customFontFiles.map((f) => f.url);
    if (fontUrls.length > 0) {
      await this.fileUploadService.deleteFiles(fontUrls);
    }

    // Actualizar configuración
    const updatedConfig = config.removeAllFontFiles();
    await this.configRepository.save(updatedConfig);
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  /**
   * Convierte WhiteLabelConfig a DTO de respuesta
   */
  private toResponseDto(config: WhiteLabelConfig): WhiteLabelConfigResponseDto {
    const primitives = config.toPrimitives();

    return {
      id: primitives.id,
      companyId: primitives.companyId,
      colors: primitives.colors,
      branding: primitives.branding,
      typography: {
        fontFamily: primitives.typography.fontFamily,
        customFontName: primitives.typography.customFontName || null,
        customFontFiles: primitives.typography.customFontFiles,
      },
      theme: primitives.theme,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    };
  }

  /**
   * Actualiza la configuración con una nueva URL de logo
   */
  private async updateConfigWithLogoUrl(
    companyId: string,
    url: string,
  ): Promise<void> {
    let config: WhiteLabelConfig;
    const existingResult =
      await this.configRepository.findByCompanyId(companyId);

    if (existingResult.isOk()) {
      config = existingResult.unwrap();
      // Eliminar logo anterior si existe
      const primitives = config.toPrimitives();
      if (primitives.branding.logoUrl) {
        await this.fileUploadService.deleteFile(primitives.branding.logoUrl);
      }
    } else {
      config = WhiteLabelConfig.createDefault(
        Uuid.random().value,
        companyId,
        '',
      );
    }

    const updatedConfig = config.updateLogoUrl(url);
    await this.configRepository.save(updatedConfig);
  }

  /**
   * Actualiza la configuración con una nueva URL de favicon
   */
  private async updateConfigWithFaviconUrl(
    companyId: string,
    url: string,
  ): Promise<void> {
    let config: WhiteLabelConfig;
    const existingResult =
      await this.configRepository.findByCompanyId(companyId);

    if (existingResult.isOk()) {
      config = existingResult.unwrap();
      // Eliminar favicon anterior si existe
      const primitives = config.toPrimitives();
      if (primitives.branding.faviconUrl) {
        await this.fileUploadService.deleteFile(primitives.branding.faviconUrl);
      }
    } else {
      config = WhiteLabelConfig.createDefault(
        Uuid.random().value,
        companyId,
        '',
      );
    }

    const updatedConfig = config.updateFaviconUrl(url);
    await this.configRepository.save(updatedConfig);
  }

  /**
   * Añade un archivo de fuente a la configuración
   */
  private async addFontToConfig(
    companyId: string,
    fontFile: { name: string; url: string },
  ): Promise<void> {
    let config: WhiteLabelConfig;
    const existingResult =
      await this.configRepository.findByCompanyId(companyId);

    if (existingResult.isOk()) {
      config = existingResult.unwrap();
    } else {
      config = WhiteLabelConfig.createDefault(
        Uuid.random().value,
        companyId,
        '',
      );
    }

    const updatedConfig = config.addFontFile(fontFile);
    await this.configRepository.save(updatedConfig);
  }
}
