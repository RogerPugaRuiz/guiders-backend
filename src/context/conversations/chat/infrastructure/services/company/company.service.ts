import { Injectable, Logger } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { FindCompanyByDomainQuery } from '../../../../../company/application/queries/find-company-by-domain.query';
import { FindCompanyByDomainResponseDto } from '../../../../../company/application/dtos/find-company-by-domain-response.dto';

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);
  constructor(private readonly queryBus: QueryBus) {}

  // Método para obtener el companyId del hosting
  async getCompanyIdFromOrigin(origin: string): Promise<string | null> {
    try {
      this.logger.log(`Origin: ${origin}`);
      const domain = new URL(origin).hostname;

      //quitar www. del dominio
      const normalizedDomain = domain.startsWith('www.')
        ? domain.slice(4)
        : domain;

      // Usa la query para buscar la empresa por dominio
      const query = new FindCompanyByDomainQuery(normalizedDomain);
      const result = await this.queryBus.execute<
        FindCompanyByDomainQuery,
        FindCompanyByDomainResponseDto | null
      >(query);

      // El QueryBus devuelve directamente el DTO de respuesta, no un Result
      if (!result) {
        this.logger.warn(`No se encontró empresa para el dominio: ${domain}`);
        return null;
      }

      this.logger.log(
        `Empresa encontrada: ${result.companyName} (${result.id})`,
      );
      return result.id;
    } catch (error) {
      this.logger.error('Error al obtener companyId del origin', error);
      return null;
    }
  }
}
