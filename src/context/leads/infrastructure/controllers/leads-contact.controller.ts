import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  BadRequestException,
  NotFoundException,
  Inject,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CommandBus } from '@nestjs/cqrs';
import { DualAuthGuard } from '../../../shared/infrastructure/guards/dual-auth.guard';
import { RolesGuard } from '../../../shared/infrastructure/guards/role.guard';
import { Roles } from '../../../shared/infrastructure/roles.decorator';
import {
  SaveLeadContactDataDto,
  LeadContactDataResponseDto,
} from '../../application/dtos/lead-contact-data.dto';
import { UpdateContactDataDto } from '../../application/dtos/update-contact-data.dto';
import { SaveLeadContactDataCommand } from '../../application/commands/save-lead-contact-data.command';
import {
  ILeadContactDataRepository,
  LEAD_CONTACT_DATA_REPOSITORY,
} from '../../domain/lead-contact-data.repository';
import { VisitorNotFoundError } from '../../domain/errors/leads.error';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    roles: string[];
    companyId: string;
  };
}

@ApiTags('Leads - Datos de Contacto')
@ApiBearerAuth()
@Controller('v1/leads/contact-data')
@UseGuards(DualAuthGuard, RolesGuard)
export class LeadsContactController {
  constructor(
    private readonly commandBus: CommandBus,
    @Inject(LEAD_CONTACT_DATA_REPOSITORY)
    private readonly contactDataRepository: ILeadContactDataRepository,
  ) {}

  @Post()
  @Roles(['admin', 'commercial'])
  @ApiOperation({ summary: 'Guardar datos de contacto de un lead' })
  @ApiResponse({
    status: 201,
    description: 'Datos de contacto guardados',
    type: LeadContactDataResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permisos' })
  async saveContactData(
    @Body() dto: SaveLeadContactDataDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<LeadContactDataResponseDto> {
    const companyId = request.user.companyId;

    const result = await this.commandBus.execute(
      new SaveLeadContactDataCommand({
        visitorId: dto.visitorId,
        companyId,
        nombre: dto.nombre,
        apellidos: dto.apellidos,
        email: dto.email,
        telefono: dto.telefono,
        dni: dto.dni,
        poblacion: dto.poblacion,
        additionalData: dto.additionalData,
        extractedFromChatId: dto.extractedFromChatId,
      }),
    );

    if (result.isErr()) {
      throw new BadRequestException(result.error.message);
    }

    // Obtener los datos guardados para la respuesta
    const savedResult = await this.contactDataRepository.findByVisitorId(
      dto.visitorId,
      companyId,
    );

    if (savedResult.isErr()) {
      throw new BadRequestException('Error al recuperar datos guardados');
    }

    const saved = savedResult.unwrap();
    if (!saved) {
      throw new BadRequestException('Error al recuperar datos guardados');
    }

    return LeadContactDataResponseDto.fromPrimitives(saved);
  }

  @Post(':visitorId')
  @Roles(['admin', 'commercial'])
  @HttpCode(200)
  @ApiOperation({
    summary: 'Actualizar datos de contacto de un lead por visitor ID',
    description:
      'Crea o actualiza datos de contacto para un visitor. Retorna 201 si se crea, 200 si se actualiza.',
  })
  @ApiParam({ name: 'visitorId', description: 'ID del visitante' })
  @ApiResponse({
    status: 201,
    description: 'Datos de contacto creados',
  })
  @ApiResponse({
    status: 200,
    description: 'Datos de contacto actualizados',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Visitor no encontrado' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permisos' })
  async updateContactDataByVisitorId(
    @Param('visitorId') visitorId: string,
    @Body() dto: UpdateContactDataDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<any> {
    const companyId = request.user.companyId;

    // Crear command con datos
    const command = new SaveLeadContactDataCommand({
      visitorId,
      companyId,
      nombre: dto.nombre,
      apellidos: dto.apellidos,
      email: dto.email,
      telefono: dto.telefono,
      poblacion: dto.poblacion,
    });

    // Ejecutar
    const result = await this.commandBus.execute(command);

    if (result.isErr()) {
      const error = result.unwrapErr();
      if (error instanceof VisitorNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message);
    }

    // Desempaquetar resultado
    const { isNew } = result.unwrap();

    // Retornar con status code correcto
    if (isNew) {
      return {
        statusCode: 201,
        message: 'Datos de contacto creados',
      };
    } else {
      return {
        statusCode: 200,
        message: 'Datos de contacto actualizados',
      };
    }
  }

  @Get('visitor/:visitorId')
  @Roles(['admin', 'commercial'])
  @ApiOperation({ summary: 'Obtener datos de contacto por visitor ID' })
  @ApiParam({ name: 'visitorId', description: 'ID del visitante' })
  @ApiResponse({
    status: 200,
    description: 'Datos de contacto encontrados',
    type: LeadContactDataResponseDto,
  })
  @ApiResponse({ status: 404, description: 'No encontrado' })
  async getByVisitorId(
    @Param('visitorId') visitorId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<LeadContactDataResponseDto> {
    const companyId = request.user.companyId;

    const result = await this.contactDataRepository.findByVisitorId(
      visitorId,
      companyId,
    );

    if (result.isErr()) {
      throw new BadRequestException(result.error.message);
    }

    const contactData = result.unwrap();
    if (!contactData) {
      throw new NotFoundException(
        `Datos de contacto no encontrados para visitor ${visitorId}`,
      );
    }

    return LeadContactDataResponseDto.fromPrimitives(contactData);
  }

  @Get(':id')
  @Roles(['admin', 'commercial'])
  @ApiOperation({ summary: 'Obtener datos de contacto por ID' })
  @ApiParam({ name: 'id', description: 'ID del registro de datos de contacto' })
  @ApiResponse({
    status: 200,
    description: 'Datos de contacto encontrados',
    type: LeadContactDataResponseDto,
  })
  @ApiResponse({ status: 404, description: 'No encontrado' })
  async getById(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<LeadContactDataResponseDto> {
    const companyId = request.user.companyId;

    const result = await this.contactDataRepository.findById(id);

    if (result.isErr()) {
      throw new BadRequestException(result.error.message);
    }

    const contactData = result.unwrap();
    if (!contactData) {
      throw new NotFoundException(
        `Datos de contacto con id ${id} no encontrados`,
      );
    }

    // Verificar que pertenece a la misma empresa
    if (contactData.companyId !== companyId) {
      throw new NotFoundException(
        `Datos de contacto con id ${id} no encontrados`,
      );
    }

    return LeadContactDataResponseDto.fromPrimitives(contactData);
  }

  @Get('company/all')
  @Roles(['admin'])
  @ApiOperation({
    summary: 'Obtener todos los datos de contacto de la empresa',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de datos de contacto',
    type: [LeadContactDataResponseDto],
  })
  async getAllByCompany(
    @Req() request: AuthenticatedRequest,
  ): Promise<LeadContactDataResponseDto[]> {
    const companyId = request.user.companyId;

    const result = await this.contactDataRepository.findByCompanyId(companyId);

    if (result.isErr()) {
      throw new BadRequestException(result.error.message);
    }

    const contactDataList = result.unwrap();
    return contactDataList.map((cd) =>
      LeadContactDataResponseDto.fromPrimitives(cd),
    );
  }
}
