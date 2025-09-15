import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CreateCompanyDto } from '../../application/dtos/create-company.dto';
import { CreateCompanyWithAdminCommand } from '../../application/commands/create-company-with-admin.command';
import { FindCompanyByDomainQuery } from '../../application/queries/find-company-by-domain.query';
import { FindCompanyByDomainResponseDto } from '../../application/dtos/find-company-by-domain-response.dto';

@ApiTags('companies')
@Controller('company')
export class CompanyController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
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

  @Get('by-domain/:domain')
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
    return await this.queryBus.execute(query);
  }
}
