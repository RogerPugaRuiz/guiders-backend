import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { GetCompanySitesQuery } from './get-company-sites.query';
import {
  COMPANY_REPOSITORY,
  CompanyRepository,
} from '../../domain/company.repository';
import { GetCompanySitesResponseDto } from '../dtos/get-company-sites-response.dto';
import { Uuid } from '../../../shared/domain/value-objects/uuid';

@QueryHandler(GetCompanySitesQuery)
export class GetCompanySitesQueryHandler
  implements
    IQueryHandler<GetCompanySitesQuery, GetCompanySitesResponseDto | null>
{
  private readonly logger = new Logger(GetCompanySitesQueryHandler.name);

  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepository: CompanyRepository,
  ) {}

  async execute(
    query: GetCompanySitesQuery,
  ): Promise<GetCompanySitesResponseDto | null> {
    this.logger.log(`Obteniendo sites de la empresa: ${query.companyId}`);

    if (!Uuid.validate(query.companyId)) {
      return null;
    }

    const result = await this.companyRepository.findById(
      new Uuid(query.companyId),
    );
    if (result.isErr()) {
      return null;
    }

    const company = result.value;
    const primitives = company.toPrimitives();
    return GetCompanySitesResponseDto.fromPrimitives({
      id: primitives.id,
      sites: primitives.sites,
    });
  }
}
