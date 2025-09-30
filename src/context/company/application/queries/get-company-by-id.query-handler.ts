import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { GetCompanyByIdQuery } from './get-company-by-id.query';
import {
  COMPANY_REPOSITORY,
  CompanyRepository,
} from '../../domain/company.repository';
import { FindCompanyByDomainResponseDto } from '../dtos/find-company-by-domain-response.dto';
import { Uuid } from '../../../shared/domain/value-objects/uuid';

@QueryHandler(GetCompanyByIdQuery)
export class GetCompanyByIdQueryHandler
  implements
    IQueryHandler<GetCompanyByIdQuery, FindCompanyByDomainResponseDto | null>
{
  private readonly logger = new Logger(GetCompanyByIdQueryHandler.name);

  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepository: CompanyRepository,
  ) {}

  async execute(
    query: GetCompanyByIdQuery,
  ): Promise<FindCompanyByDomainResponseDto | null> {
    this.logger.log(`Obteniendo empresa por ID: ${query.companyId}`);

    // Validar que el ID es un UUID válido
    if (!Uuid.validate(query.companyId)) {
      this.logger.warn(`ID de empresa inválido: ${query.companyId}`);
      return null;
    }

    // Buscar la empresa por ID en el repositorio
    const result = await this.companyRepository.findById(
      new Uuid(query.companyId),
    );

    if (result.isErr()) {
      this.logger.warn(`Empresa no encontrada para el ID: ${query.companyId}`);
      return null;
    }

    // Convertir la entidad de dominio a DTO de respuesta
    const company = result.value;
    const primitives = company.toPrimitives();
    const responseDto =
      FindCompanyByDomainResponseDto.fromPrimitives(primitives);

    this.logger.log(
      `Empresa encontrada: ${primitives.companyName} (${primitives.id})`,
    );

    return responseDto;
  }
}
