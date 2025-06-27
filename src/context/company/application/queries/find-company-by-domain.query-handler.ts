// QueryHandler para buscar empresa por dominio
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { FindCompanyByDomainQuery } from './find-company-by-domain.query';
import { FindCompanyByDomainResponseDto } from '../dtos/find-company-by-domain-response.dto';
import {
  CompanyRepository,
  COMPANY_REPOSITORY,
} from '../../domain/company.repository';

@QueryHandler(FindCompanyByDomainQuery)
export class FindCompanyByDomainQueryHandler
  implements
    IQueryHandler<
      FindCompanyByDomainQuery,
      FindCompanyByDomainResponseDto | null
    >
{
  private readonly logger = new Logger(FindCompanyByDomainQueryHandler.name);

  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepository: CompanyRepository,
  ) {}

  async execute(
    query: FindCompanyByDomainQuery,
  ): Promise<FindCompanyByDomainResponseDto | null> {
    try {
      this.logger.log(`Buscando empresa por dominio: ${query.domain}`);

      // Busca la empresa por dominio en el repositorio
      const companyResult = await this.companyRepository.findByDomain(
        query.domain,
      );

      if (companyResult.isErr()) {
        this.logger.warn(
          `Empresa no encontrada para el dominio: ${query.domain}`,
        );
        return null;
      }

      // Convierte la entidad de dominio a DTO de respuesta
      const company = companyResult.value;
      const primitives = company.toPrimitives();
      const responseDto =
        FindCompanyByDomainResponseDto.fromPrimitives(primitives);

      this.logger.log(
        `Empresa encontrada: ${primitives.companyName} (${primitives.id})`,
      );

      return responseDto;
    } catch (error) {
      this.logger.error(
        `Error al buscar empresa por dominio: ${query.domain}`,
        error,
      );
      return null;
    }
  }
}
