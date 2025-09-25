import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ResolveSiteCommand } from './resolve-site.command';
import { ResolveSiteResponseDto } from '../dtos/resolve-site-response.dto';
import {
  CompanyRepository,
  COMPANY_REPOSITORY,
} from '../../../company/domain/company.repository';

@CommandHandler(ResolveSiteCommand)
export class ResolveSiteCommandHandler
  implements ICommandHandler<ResolveSiteCommand>
{
  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepository: CompanyRepository,
  ) {}

  async execute(command: ResolveSiteCommand): Promise<ResolveSiteResponseDto> {
    const { host } = command;

    // Buscar la empresa que maneja este dominio
    const companyResult = await this.companyRepository.findByDomain(host);

    if (companyResult.isErr()) {
      throw new Error(`No se encontró un sitio para el host: ${host}`);
    }

    const company = companyResult.value;

    // Buscar el site específico que maneja este dominio
    const sites = company.getSites();
    const sitePrimitives = sites.toPrimitives();

    const targetSite = sitePrimitives.find(
      (site) =>
        site.canonicalDomain === host || site.domainAliases.includes(host),
    );

    if (!targetSite) {
      throw new Error(
        `No se encontró un sitio específico para el host: ${host}`,
      );
    }

    // Preferimos el dominio canónico como nombre visible del site.
    const resolvedSiteName = targetSite.canonicalDomain || targetSite.name;

    return new ResolveSiteResponseDto(
      company.getId().getValue(),
      targetSite.id,
      resolvedSiteName,
      company.getCompanyName().getValue(),
    );
  }
}
