import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CreateCompanyDto } from '../../application/dtos/create-company.dto';
import { CreateCompanyWithAdminCommand } from '../../application/commands/create-company-with-admin.command';
import { FindCompanyByDomainQuery } from '../../application/queries/find-company-by-domain.query';
import { FindCompanyByDomainResponseDto } from '../../application/dtos/find-company-by-domain-response.dto';
import { ResolveSiteByHostQuery } from '../../application/queries/resolve-site-by-host.query';
import { ResolveSiteByHostResponseDto } from '../../application/dtos/resolve-site-by-host-response.dto';

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
}
