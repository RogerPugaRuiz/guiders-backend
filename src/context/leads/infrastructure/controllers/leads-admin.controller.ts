import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { DualAuthGuard } from 'src/context/shared/infrastructure/guards/dual-auth.guard';
import { RolesGuard } from 'src/context/shared/infrastructure/guards/role.guard';
import { Roles } from 'src/context/shared/infrastructure/roles.decorator';
import {
  CreateCrmConfigDto,
  UpdateCrmConfigDto,
  CrmConfigResponseDto,
  TestCrmConnectionDto,
  TestConnectionResponseDto,
  CrmSyncRecordResponseDto,
} from '../../application/dtos/crm-config.dto';
import {
  ICrmCompanyConfigRepository,
  CRM_COMPANY_CONFIG_REPOSITORY,
} from '../../domain/crm-company-config.repository';
import {
  ICrmSyncRecordRepository,
  CRM_SYNC_RECORD_REPOSITORY,
} from '../../domain/crm-sync-record.repository';
import {
  ICrmSyncServiceFactory,
  CRM_SYNC_SERVICE_FACTORY,
} from '../../domain/services/crm-sync.service';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    roles: string[];
    companyId: string;
  };
}

@ApiTags('Leads - Administración CRM')
@ApiBearerAuth()
@Controller('v1/leads/admin')
@UseGuards(DualAuthGuard, RolesGuard)
export class LeadsAdminController {
  constructor(
    @Inject(CRM_COMPANY_CONFIG_REPOSITORY)
    private readonly configRepository: ICrmCompanyConfigRepository,
    @Inject(CRM_SYNC_RECORD_REPOSITORY)
    private readonly syncRecordRepository: ICrmSyncRecordRepository,
    @Inject(CRM_SYNC_SERVICE_FACTORY)
    private readonly crmSyncServiceFactory: ICrmSyncServiceFactory,
  ) {}

  // ==================== Configuración CRM ====================

  @Post('config')
  @Roles(['admin'])
  @ApiOperation({ summary: 'Crear configuración de CRM para la empresa' })
  @ApiResponse({
    status: 201,
    description: 'Configuración creada',
    type: CrmConfigResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o CRM ya configurado',
  })
  async createConfig(
    @Body() dto: CreateCrmConfigDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<CrmConfigResponseDto> {
    const companyId = request.user.companyId;

    // Verificar que el companyId del DTO coincida (o usar el del token)
    if (dto.companyId !== companyId) {
      throw new BadRequestException(
        'El companyId no coincide con el de la sesión',
      );
    }

    // Verificar si ya existe configuración para este CRM
    const existingResult = await this.configRepository.findByCompanyAndType(
      companyId,
      dto.crmType,
    );

    if (existingResult.isOk() && existingResult.unwrap()) {
      throw new BadRequestException(
        `Ya existe una configuración de ${dto.crmType} para esta empresa`,
      );
    }

    // Validar configuración con el adapter
    const adapter = this.crmSyncServiceFactory.getAdapter(dto.crmType);
    if (!adapter) {
      throw new BadRequestException(`Tipo de CRM no soportado: ${dto.crmType}`);
    }

    const now = new Date();
    const configPrimitives = {
      id: Uuid.random().value,
      companyId,
      crmType: dto.crmType,
      enabled: dto.enabled ?? true,
      syncChatConversations: dto.syncChatConversations ?? false,
      triggerEvents: dto.triggerEvents ?? ['lifecycle_to_lead'],
      config: dto.config as unknown as Record<string, unknown>,
      createdAt: now,
      updatedAt: now,
    };

    const validationErrors = adapter.validateConfig(configPrimitives);

    if (validationErrors.length > 0) {
      throw new BadRequestException(
        `Configuración inválida: ${validationErrors.join(', ')}`,
      );
    }

    const saveResult = await this.configRepository.save(configPrimitives);
    if (saveResult.isErr()) {
      throw new BadRequestException(saveResult.error.message);
    }

    return CrmConfigResponseDto.fromPrimitives(configPrimitives);
  }

  @Get('config')
  @Roles(['admin'])
  @ApiOperation({
    summary: 'Obtener todas las configuraciones CRM de la empresa',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de configuraciones',
    type: [CrmConfigResponseDto],
  })
  async getConfigs(
    @Req() request: AuthenticatedRequest,
  ): Promise<CrmConfigResponseDto[]> {
    const companyId = request.user.companyId;

    const result = await this.configRepository.findByCompanyId(companyId);
    if (result.isErr()) {
      throw new BadRequestException(result.error.message);
    }

    return result
      .unwrap()
      .map((config) => CrmConfigResponseDto.fromPrimitives(config));
  }

  @Get('config/:id')
  @Roles(['admin'])
  @ApiOperation({ summary: 'Obtener configuración CRM por ID' })
  @ApiParam({ name: 'id', description: 'ID de la configuración' })
  @ApiResponse({
    status: 200,
    description: 'Configuración encontrada',
    type: CrmConfigResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Configuración no encontrada' })
  async getConfigById(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<CrmConfigResponseDto> {
    const companyId = request.user.companyId;

    const result = await this.configRepository.findById(id);
    if (result.isErr()) {
      throw new BadRequestException(result.error.message);
    }

    const config = result.unwrap();
    if (!config) {
      throw new NotFoundException(`Configuración con id ${id} no encontrada`);
    }

    // Verificar pertenencia a la empresa
    if (config.companyId !== companyId) {
      throw new NotFoundException(`Configuración con id ${id} no encontrada`);
    }

    return CrmConfigResponseDto.fromPrimitives(config);
  }

  @Put('config/:id')
  @Roles(['admin'])
  @ApiOperation({ summary: 'Actualizar configuración CRM' })
  @ApiParam({ name: 'id', description: 'ID de la configuración' })
  @ApiResponse({
    status: 200,
    description: 'Configuración actualizada',
    type: CrmConfigResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Configuración no encontrada' })
  async updateConfig(
    @Param('id') id: string,
    @Body() dto: UpdateCrmConfigDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<CrmConfigResponseDto> {
    const companyId = request.user.companyId;

    const findResult = await this.configRepository.findById(id);
    if (findResult.isErr()) {
      throw new BadRequestException(findResult.error.message);
    }

    const existingConfig = findResult.unwrap();
    if (!existingConfig) {
      throw new NotFoundException(`Configuración con id ${id} no encontrada`);
    }

    if (existingConfig.companyId !== companyId) {
      throw new NotFoundException(`Configuración con id ${id} no encontrada`);
    }

    // Crear configuración actualizada
    const updatedPrimitives = {
      ...existingConfig,
      enabled: dto.enabled ?? existingConfig.enabled,
      syncChatConversations:
        dto.syncChatConversations ?? existingConfig.syncChatConversations,
      triggerEvents: dto.triggerEvents ?? existingConfig.triggerEvents,
      config:
        (dto.config as unknown as Record<string, unknown>) ??
        existingConfig.config,
      updatedAt: new Date(),
    };

    // Validar si hay nueva config
    if (dto.config) {
      const adapter = this.crmSyncServiceFactory.getAdapter(
        existingConfig.crmType,
      );
      if (adapter) {
        const validationErrors = adapter.validateConfig(updatedPrimitives);
        if (validationErrors.length > 0) {
          throw new BadRequestException(
            `Configuración inválida: ${validationErrors.join(', ')}`,
          );
        }
      }
    }

    const updateResult = await this.configRepository.update(updatedPrimitives);

    if (updateResult.isErr()) {
      throw new BadRequestException(updateResult.error.message);
    }

    return CrmConfigResponseDto.fromPrimitives(updatedPrimitives);
  }

  @Delete('config/:id')
  @Roles(['admin'])
  @ApiOperation({ summary: 'Eliminar configuración CRM' })
  @ApiParam({ name: 'id', description: 'ID de la configuración' })
  @ApiResponse({ status: 200, description: 'Configuración eliminada' })
  @ApiResponse({ status: 404, description: 'Configuración no encontrada' })
  async deleteConfig(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    const companyId = request.user.companyId;

    const findResult = await this.configRepository.findById(id);
    if (findResult.isErr()) {
      throw new BadRequestException(findResult.error.message);
    }

    const config = findResult.unwrap();
    if (!config) {
      throw new NotFoundException(`Configuración con id ${id} no encontrada`);
    }

    if (config.companyId !== companyId) {
      throw new NotFoundException(`Configuración con id ${id} no encontrada`);
    }

    const deleteResult = await this.configRepository.delete(id);
    if (deleteResult.isErr()) {
      throw new BadRequestException(deleteResult.error.message);
    }

    return { message: 'Configuración eliminada correctamente' };
  }

  // ==================== Test de Conexión ====================

  @Post('test-connection')
  @Roles(['admin'])
  @ApiOperation({ summary: 'Probar conexión con CRM' })
  @ApiResponse({
    status: 200,
    description: 'Resultado del test de conexión',
    type: TestConnectionResponseDto,
  })
  async testConnection(
    @Body() dto: TestCrmConnectionDto,
  ): Promise<TestConnectionResponseDto> {
    const adapter = this.crmSyncServiceFactory.getAdapter(dto.crmType);

    if (!adapter) {
      return {
        success: false,
        error: `Tipo de CRM no soportado: ${dto.crmType}`,
      };
    }

    const now = new Date();

    // Validar configuración primero
    const validationErrors = adapter.validateConfig({
      id: '',
      companyId: '',
      crmType: dto.crmType,
      enabled: true,
      syncChatConversations: false,
      triggerEvents: [],
      config: dto.config as unknown as Record<string, unknown>,
      createdAt: now,
      updatedAt: now,
    });

    if (validationErrors.length > 0) {
      return {
        success: false,
        validationErrors,
      };
    }

    // Probar conexión
    const result = await adapter.testConnection({
      id: '',
      companyId: '',
      crmType: dto.crmType,
      enabled: true,
      syncChatConversations: false,
      triggerEvents: [],
      config: dto.config as unknown as Record<string, unknown>,
      createdAt: now,
      updatedAt: now,
    });

    if (result.isErr()) {
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: result.unwrap(),
    };
  }

  // ==================== Registros de Sincronización ====================

  @Get('sync-records')
  @Roles(['admin'])
  @ApiOperation({
    summary: 'Obtener registros de sincronización de la empresa',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de registros de sincronización',
    type: [CrmSyncRecordResponseDto],
  })
  async getSyncRecords(
    @Req() request: AuthenticatedRequest,
  ): Promise<CrmSyncRecordResponseDto[]> {
    const companyId = request.user.companyId;

    const result = await this.syncRecordRepository.findByCompanyId(companyId);
    if (result.isErr()) {
      throw new BadRequestException(result.error.message);
    }

    return result
      .unwrap()
      .map((record) => CrmSyncRecordResponseDto.fromPrimitives(record));
  }

  @Get('sync-records/visitor/:visitorId')
  @Roles(['admin', 'commercial'])
  @ApiOperation({ summary: 'Obtener registros de sincronización por visitor' })
  @ApiParam({ name: 'visitorId', description: 'ID del visitante' })
  @ApiResponse({
    status: 200,
    description: 'Lista de registros de sincronización',
    type: [CrmSyncRecordResponseDto],
  })
  async getSyncRecordsByVisitor(
    @Param('visitorId') visitorId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<CrmSyncRecordResponseDto[]> {
    const companyId = request.user.companyId;

    const result = await this.syncRecordRepository.findByVisitorId(
      visitorId,
      companyId,
    );
    if (result.isErr()) {
      throw new BadRequestException(result.error.message);
    }

    const record = result.unwrap();
    if (!record) {
      return [];
    }

    return [CrmSyncRecordResponseDto.fromPrimitives(record)];
  }

  @Get('sync-records/failed')
  @Roles(['admin'])
  @ApiOperation({ summary: 'Obtener sincronizaciones fallidas' })
  @ApiResponse({
    status: 200,
    description: 'Lista de sincronizaciones fallidas',
    type: [CrmSyncRecordResponseDto],
  })
  async getFailedSyncRecords(
    @Req() request: AuthenticatedRequest,
  ): Promise<CrmSyncRecordResponseDto[]> {
    const companyId = request.user.companyId;

    const result =
      await this.syncRecordRepository.findFailedByCompanyId(companyId);
    if (result.isErr()) {
      throw new BadRequestException(result.error.message);
    }

    return result
      .unwrap()
      .map((record) => CrmSyncRecordResponseDto.fromPrimitives(record));
  }

  // ==================== Información del Sistema ====================

  @Get('supported-crms')
  @Roles(['admin'])
  @ApiOperation({ summary: 'Obtener lista de CRMs soportados' })
  @ApiResponse({
    status: 200,
    description: 'Lista de tipos de CRM soportados',
    type: [String],
  })
  getSupportedCrms(): string[] {
    return this.crmSyncServiceFactory.getSupportedCrmTypes();
  }
}
