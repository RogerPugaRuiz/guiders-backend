// Handler para el comando CreateCompanyCommand siguiendo DDD + CQRS
import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { CreateCompanyCommand } from './create-company.command';
import {
  COMPANY_REPOSITORY,
  CompanyRepository,
} from '../../domain/company.repository';
import { Company } from '../../domain/company';
import { CompanyName } from '../../domain/value-objects/company-name';
import { CompanySites } from '../../domain/value-objects/company-sites';
import { Site } from '../../domain/entities/site';
import { SiteId } from '../../domain/value-objects/site-id';
import { SiteName } from '../../domain/value-objects/site-name';
import { CanonicalDomain } from '../../domain/value-objects/canonical-domain';
import { DomainAliases } from '../../domain/value-objects/domain-aliases';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import { Inject } from '@nestjs/common';

@CommandHandler(CreateCompanyCommand)
export class CreateCompanyCommandHandler
  implements ICommandHandler<CreateCompanyCommand>
{
  // Inyecta el repositorio de compañías
  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepository: CompanyRepository,
    private readonly publisher: EventPublisher,
  ) {}

  // Ejecuta el comando para crear y guardar la compañía
  async execute(command: CreateCompanyCommand): Promise<void> {
    const { companyName, sites } = command.params;

    // Crear sites a partir de los primitivos recibidos
    const siteEntities = sites.map((siteData) => {
      return Site.create({
        id: siteData.id ? new SiteId(siteData.id) : SiteId.random(),
        name: new SiteName(siteData.name),
        canonicalDomain: new CanonicalDomain(siteData.canonicalDomain),
        domainAliases: DomainAliases.fromPrimitives(siteData.domainAliases),
      });
    });

    // Se crea la entidad de dominio Company
    const company = Company.create({
      id: Uuid.random(),
      companyName: new CompanyName(companyName),
      sites: CompanySites.fromSiteArray(siteEntities),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Se integra el contexto de eventos para publicar los eventos de dominio
    const companyAggregate = this.publisher.mergeObjectContext(company);
    // Persiste la compañía usando el repositorio
    await this.companyRepository.save(companyAggregate);
    // Publica los eventos de dominio generados
    companyAggregate.commit();
  }
}
// Este handler recibe el DTO, crea la entidad y la guarda usando el repositorio, siguiendo DDD y CQRS.
