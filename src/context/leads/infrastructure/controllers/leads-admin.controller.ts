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
  InternalServerErrorException,
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
  TestConnectionByIdResponseDto,
  CrmSyncRecordResponseDto,
  LeadcarsConcesionarioDto,
  LeadcarsSedeDto,
  LeadcarsCampanaDto,
  LeadcarsTipoLeadDto,
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
  ILeadContactDataRepository,
  LEAD_CONTACT_DATA_REPOSITORY,
} from '../../domain/lead-contact-data.repository';
import {
  ICrmSyncServiceFactory,
  CRM_SYNC_SERVICE_FACTORY,
} from '../../domain/services/crm-sync.service';
import { LeadcarsApiService } from '../adapters/leadcars/leadcars-api.service';
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
    @Inject(LEAD_CONTACT_DATA_REPOSITORY)
    private readonly contactDataRepository: ILeadContactDataRepository,
    private readonly leadcarsApiService: LeadcarsApiService,
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
    summary:
      'Obtener la configuración CRM de la empresa (primera activa) o 404 si no existe',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuración encontrada',
    type: CrmConfigResponseDto,
  })
  @ApiResponse({ status: 404, description: 'No hay configuración CRM creada' })
  async getConfig(
    @Req() request: AuthenticatedRequest,
  ): Promise<CrmConfigResponseDto> {
    const companyId = request.user.companyId;

    const result = await this.configRepository.findByCompanyId(companyId);
    if (result.isErr()) {
      throw new BadRequestException(result.error.message);
    }

    const configs = result.unwrap();
    if (!configs.length) {
      throw new NotFoundException(
        'No existe configuración CRM para esta empresa',
      );
    }

    // Devuelve la primera (en la práctica solo hay una por empresa+crmType)
    return CrmConfigResponseDto.fromPrimitives(configs[0]);
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

  @Post('config/:configId/test')
  @Roles(['admin'])
  @ApiOperation({
    summary:
      'Probar conexión con LeadCars usando la configuración guardada por ID',
  })
  @ApiParam({ name: 'configId', description: 'ID de la configuración' })
  @ApiResponse({
    status: 200,
    description: 'Resultado del test de conexión',
    type: TestConnectionByIdResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Configuración no encontrada' })
  async testConnectionById(
    @Param('configId') configId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<TestConnectionByIdResponseDto> {
    const companyId = request.user.companyId;

    const findResult = await this.configRepository.findById(configId);
    if (findResult.isErr()) {
      throw new BadRequestException(findResult.error.message);
    }

    const config = findResult.unwrap();
    if (!config) {
      throw new NotFoundException(
        `Configuración con id ${configId} no encontrada`,
      );
    }

    if (config.companyId !== companyId) {
      throw new NotFoundException(
        `Configuración con id ${configId} no encontrada`,
      );
    }

    const adapter = this.crmSyncServiceFactory.getAdapter(config.crmType);
    if (!adapter) {
      return {
        success: false,
        message: `Tipo de CRM no soportado: ${config.crmType}`,
      };
    }

    const result = await adapter.testConnection(config);

    if (result.isErr()) {
      return {
        success: false,
        message: result.error.message,
      };
    }

    return {
      success: result.unwrap(),
      message: result.unwrap()
        ? 'Conexión con LeadCars establecida correctamente'
        : 'No se pudo establecer conexión con LeadCars',
    };
  }

  @Post('test-connection')
  @Roles(['admin'])
  @ApiOperation({
    summary: 'Probar conexión con CRM con credenciales manuales',
  })
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

    return Promise.all(
      result.unwrap().map(async (record) => {
        const contactResult = await this.contactDataRepository.findByVisitorId(
          record.visitorId,
          companyId,
        );
        const contactData = contactResult.isOk()
          ? contactResult.unwrap()
          : null;
        return CrmSyncRecordResponseDto.fromPrimitives(record, contactData);
      }),
    );
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

    return Promise.all(
      result.unwrap().map(async (record) => {
        const contactResult = await this.contactDataRepository.findByVisitorId(
          record.visitorId,
          companyId,
        );
        const contactData = contactResult.isOk()
          ? contactResult.unwrap()
          : null;
        return CrmSyncRecordResponseDto.fromPrimitives(record, contactData);
      }),
    );
  }

  // ==================== Proxy LeadCars ====================

  private async getLeadcarsConfigForCompany(companyId: string) {
    const result = await this.configRepository.findByCompanyAndType(
      companyId,
      'leadcars',
    );
    if (result.isErr()) {
      throw new BadRequestException(result.error.message);
    }
    const config = result.unwrap();
    if (!config) {
      throw new NotFoundException(
        'No existe configuración de LeadCars para esta empresa',
      );
    }
    if (!config.enabled) {
      throw new BadRequestException(
        'La configuración de LeadCars está deshabilitada',
      );
    }
    return {
      clienteToken: config.config.clienteToken as string,
      useSandbox: (config.config.useSandbox as boolean) ?? false,
      concesionarioId: config.config.concesionarioId as number,
      sedeId: config.config.sedeId as number | undefined,
      campanaCode: (config.config.campanaCode || config.config.campana) as
        | string
        | undefined,
      tipoLeadDefault: config.config.tipoLeadDefault as number,
    };
  }

  @Get('leadcars/concesionarios')
  @Roles(['admin'])
  @ApiOperation({
    summary: 'Listar concesionarios disponibles en LeadCars',
    description:
      'Proxy al endpoint GET /concesionarios de LeadCars usando el token guardado',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de concesionarios',
    type: [LeadcarsConcesionarioDto],
  })
  @ApiResponse({ status: 404, description: 'No hay configuración de LeadCars' })
  async getLeadcarsConcesionarios(
    @Req() request: AuthenticatedRequest,
  ): Promise<LeadcarsConcesionarioDto[]> {
    const companyId = request.user.companyId;
    const leadcarsConfig = await this.getLeadcarsConfigForCompany(companyId);

    const result =
      await this.leadcarsApiService.listConcesionarios(leadcarsConfig);
    if (result.isErr()) {
      throw new InternalServerErrorException(
        `Error al obtener concesionarios de LeadCars: ${result.error.message}`,
      );
    }

    const response = result.unwrap();
    if (!response.success || !response.data) {
      throw new InternalServerErrorException(
        'LeadCars no devolvió datos de concesionarios',
      );
    }

    return response.data.map((c) => ({ id: c.id, nombre: c.nombre }));
  }

  @Get('leadcars/sedes/:concesionarioId')
  @Roles(['admin'])
  @ApiOperation({
    summary: 'Listar sedes de un concesionario en LeadCars',
    description:
      'Proxy al endpoint GET /sedes/:id de LeadCars usando el token guardado',
  })
  @ApiParam({
    name: 'concesionarioId',
    description: 'ID del concesionario en LeadCars',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de sedes',
    type: [LeadcarsSedeDto],
  })
  @ApiResponse({ status: 404, description: 'No hay configuración de LeadCars' })
  async getLeadcarsSedes(
    @Param('concesionarioId') concesionarioId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<LeadcarsSedeDto[]> {
    const companyId = request.user.companyId;
    const leadcarsConfig = await this.getLeadcarsConfigForCompany(companyId);
    const concesionarioIdNum = parseInt(concesionarioId, 10);

    if (isNaN(concesionarioIdNum)) {
      throw new BadRequestException('concesionarioId debe ser un número');
    }

    const result = await this.leadcarsApiService.listSedes(
      concesionarioIdNum,
      leadcarsConfig,
    );
    if (result.isErr()) {
      throw new InternalServerErrorException(
        `Error al obtener sedes de LeadCars: ${result.error.message}`,
      );
    }

    const response = result.unwrap();
    if (!response.success || !response.data) {
      throw new InternalServerErrorException(
        'LeadCars no devolvió datos de sedes',
      );
    }

    return response.data.map((s) => ({
      id: s.id,
      nombre: s.nombre,
      concesionarioId: s.concesionario_id,
    }));
  }

  @Get('leadcars/campanas/:concesionarioId')
  @Roles(['admin'])
  @ApiOperation({
    summary: 'Listar campañas de un concesionario en LeadCars',
    description:
      'Proxy al endpoint GET /campanas/:id de LeadCars usando el token guardado',
  })
  @ApiParam({
    name: 'concesionarioId',
    description: 'ID del concesionario en LeadCars',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de campañas',
    type: [LeadcarsCampanaDto],
  })
  @ApiResponse({ status: 404, description: 'No hay configuración de LeadCars' })
  async getLeadcarsCampanas(
    @Param('concesionarioId') concesionarioId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<LeadcarsCampanaDto[]> {
    const companyId = request.user.companyId;
    const leadcarsConfig = await this.getLeadcarsConfigForCompany(companyId);
    const concesionarioIdNum = parseInt(concesionarioId, 10);

    if (isNaN(concesionarioIdNum)) {
      throw new BadRequestException('concesionarioId debe ser un número');
    }

    // Usar el concesionarioId del parámetro (no el de la config)
    const configForRequest = {
      ...leadcarsConfig,
      concesionarioId: concesionarioIdNum,
    };

    const result = await this.leadcarsApiService.listCampanas(
      concesionarioIdNum,
      configForRequest,
    );
    if (result.isErr()) {
      throw new InternalServerErrorException(
        `Error al obtener campañas de LeadCars: ${result.error.message}`,
      );
    }

    const response = result.unwrap();
    if (!response.success || !response.data) {
      throw new InternalServerErrorException(
        'LeadCars no devolvió datos de campañas',
      );
    }

    return response.data.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      codigo: c.codigo,
      concesionarioId: concesionarioIdNum,
    }));
  }

  @Get('leadcars/tipos')
  @Roles(['admin'])
  @ApiOperation({
    summary: 'Listar tipos de lead disponibles en LeadCars',
    description:
      'Proxy al endpoint GET /tipos de LeadCars usando el token guardado',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de tipos de lead',
    type: [LeadcarsTipoLeadDto],
  })
  @ApiResponse({ status: 404, description: 'No hay configuración de LeadCars' })
  async getLeadcarsTipos(
    @Req() request: AuthenticatedRequest,
  ): Promise<LeadcarsTipoLeadDto[]> {
    const companyId = request.user.companyId;
    const leadcarsConfig = await this.getLeadcarsConfigForCompany(companyId);

    const result = await this.leadcarsApiService.listTipos(leadcarsConfig);
    if (result.isErr()) {
      throw new InternalServerErrorException(
        `Error al obtener tipos de lead de LeadCars: ${result.error.message}`,
      );
    }

    const response = result.unwrap();
    if (!response.success || !response.data) {
      throw new InternalServerErrorException(
        'LeadCars no devolvió datos de tipos de lead',
      );
    }

    return response.data.map((t) => ({ id: t.id, nombre: t.nombre }));
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
