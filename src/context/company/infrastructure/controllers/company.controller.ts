import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  NotFoundException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CreateCompanyDto } from '../../application/dtos/create-company.dto';
import { CreateCompanyWithAdminCommand } from '../../application/commands/create-company-with-admin.command';
import { FindCompanyByDomainQuery } from '../../application/queries/find-company-by-domain.query';
import { FindCompanyByDomainResponseDto } from '../../application/dtos/find-company-by-domain-response.dto';
import { MyCompanyResponseDto } from '../../application/dtos/my-company-response.dto';
import { ResolveSiteByHostQuery } from '../../application/queries/resolve-site-by-host.query';
import { ResolveSiteByHostResponseDto } from '../../application/dtos/resolve-site-by-host-response.dto';
import { GetCompanySitesQuery } from '../../application/queries/get-company-sites.query';
import { GetCompanySitesResponseDto } from '../../application/dtos/get-company-sites-response.dto';
import { DualAuthGuard } from '../../../shared/infrastructure/guards/dual-auth.guard';
import { AuthenticatedRequest } from '../../../shared/infrastructure/guards/auth.guard';

@ApiTags('companies')
@Controller()
export class CompanyController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('company')
  @ApiOperation({
    summary: 'Crear nueva empresa con administrador',
    description:
      'Crea una nueva empresa junto con su usuario administrador inicial',
  })
  @ApiResponse({
    status: 201,
    description: 'Empresa creada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos proporcionados',
  })
  async createCompanyWithAdmin(
    @Body() createCompanyDto: CreateCompanyDto,
  ): Promise<void> {
    const command = new CreateCompanyWithAdminCommand({
      companyName: createCompanyDto.companyName,
      sites: createCompanyDto.sites.map((site) => ({
        id: site.id || '', // Se generará automáticamente si está vacío
        name: site.name,
        canonicalDomain: site.canonicalDomain,
        domainAliases: site.domainAliases || [],
      })),
      adminName: createCompanyDto.admin.adminName,
      adminEmail: createCompanyDto.admin.adminEmail!,
      adminTel: createCompanyDto.admin.adminTel,
    });

    await this.commandBus.execute(command);
  }

  @Post('sites/resolve')
  @ApiOperation({
    summary: 'Resolver sitio por host',
    description:
      'Resuelve el host actual del navegador y determina a qué site y tenant pertenece',
  })
  @ApiQuery({
    name: 'host',
    description: 'Host/dominio a resolver',
    example: 'landing.mytech.com',
  })
  @ApiResponse({
    status: 200,
    description: 'Sitio resuelto exitosamente',
    type: ResolveSiteByHostResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Sitio no encontrado para el host especificado',
  })
  async resolveSiteByHost(
    @Query('host') host: string,
  ): Promise<ResolveSiteByHostResponseDto> {
    const query = new ResolveSiteByHostQuery(host);
    const result = await this.queryBus.execute<
      ResolveSiteByHostQuery,
      ResolveSiteByHostResponseDto | null
    >(query);

    if (!result) {
      throw new NotFoundException(`Sitio no encontrado para el host: ${host}`);
    }

    return result;
  }

  @Get('company/by-domain/:domain')
  @ApiOperation({
    summary: 'Buscar empresa por dominio',
    description:
      'Busca una empresa basándose en uno de sus dominios (canónico o alias)',
  })
  @ApiParam({
    name: 'domain',
    description: 'Dominio de la empresa a buscar',
    example: 'ejemplo.com',
  })
  @ApiResponse({
    status: 200,
    description: 'Empresa encontrada',
    type: FindCompanyByDomainResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Empresa no encontrada',
  })
  async findByDomain(
    @Param('domain') domain: string,
  ): Promise<FindCompanyByDomainResponseDto> {
    const query = new FindCompanyByDomainQuery(domain);
    return await this.queryBus.execute<
      FindCompanyByDomainQuery,
      FindCompanyByDomainResponseDto
    >(query);
  }

  @Get('companies/:companyId/sites')
  @UseGuards(DualAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar sitios de una empresa',
    description:
      'Devuelve la lista de sites asociados a la empresa indicada por su companyId (UUID).',
  })
  @ApiParam({
    name: 'companyId',
    description: 'UUID de la empresa',
    example: '2f5f2d9a-5f84-4c06-9b68-5a9b8f7a9c1d',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de sites',
    type: GetCompanySitesResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Empresa no encontrada' })
  async getCompanySites(
    @Param('companyId') companyId: string,
  ): Promise<GetCompanySitesResponseDto> {
    const result = await this.queryBus.execute<
      GetCompanySitesQuery,
      GetCompanySitesResponseDto | null
    >(new GetCompanySitesQuery(companyId));

    if (!result) {
      throw new NotFoundException('Empresa no encontrada');
    }

    return result;
  }

  @Get('me/company')
  @UseGuards(DualAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener empresa del usuario autenticado',
    description:
      'Devuelve la información completa de la empresa a la que pertenece el usuario autenticado, incluyendo sitios y configuraciones.',
  })
  @ApiResponse({
    status: 200,
    description: 'Información de la empresa obtenida exitosamente',
    type: FindCompanyByDomainResponseDto, // Reutilizamos el DTO existente
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Empresa no encontrada' })
  @ApiResponse({
    status: 400,
    description: 'Usuario sin companyId asignado',
  })
  @ApiResponse({
    status: 200,
    description: 'Información de la empresa del usuario con siteId resuelto',
    type: MyCompanyResponseDto,
  })
  async getMyCompany(
    @Req() req: AuthenticatedRequest,
  ): Promise<MyCompanyResponseDto> {
    // Log temporal para debugging
    console.log(
      '🔍 DEBUG - req.user completo:',
      JSON.stringify(req.user, null, 2),
    );

    // Extraer companyId del usuario autenticado
    const companyId = req.user?.companyId;

    console.log('🔍 DEBUG - companyId extraído:', companyId);

    if (!companyId) {
      throw new NotFoundException(
        'Usuario no tiene empresa asignada. Contacte al administrador.',
      );
    }

    // Extraer el host de la petición para resolver el siteId
    const host = req.get('host') || (req.headers.host as string);
    console.log('🔍 DEBUG - host extraído:', host);

    // Obtener información completa de la empresa con sites
    const companyWithSites = await this.queryBus.execute<
      GetCompanySitesQuery,
      GetCompanySitesResponseDto
    >(new GetCompanySitesQuery(companyId));

    if (!companyWithSites) {
      throw new NotFoundException('Empresa no encontrada');
    }

    console.log(
      '🔍 DEBUG - empresa con sites:',
      JSON.stringify(companyWithSites, null, 2),
    );

    // Crear la respuesta con siteId resuelto basado en el host
    return MyCompanyResponseDto.fromPrimitives(
      {
        id: companyWithSites.companyId,
        companyName: companyWithSites.companyName,
        sites: companyWithSites.sites,
      },
      host,
    );
  }
}
