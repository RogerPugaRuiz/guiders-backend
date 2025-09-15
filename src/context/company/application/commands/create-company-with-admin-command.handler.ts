// Handler para CreateCompanyWithAdminCommand siguiendo DDD y CQRS
// Ubicación: src/context/company/application/commands/create-company-with-admin-command.handler.ts
import {
  CommandHandler,
  EventPublisher,
  ICommandHandler,
  EventBus,
} from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { CreateCompanyWithAdminCommand } from './create-company-with-admin.command';
import {
  COMPANY_REPOSITORY,
  CompanyRepository,
} from '../../domain/company.repository';
import { Company } from '../../domain/company';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import { CompanyName } from '../../domain/value-objects/company-name';
import { CompanyCreatedWithAdminEvent } from '../../domain/events/company-created-with-admin.event';
import { Site } from '../../domain/entities/site';
import { SiteId } from '../../domain/value-objects/site-id';
import { SiteName } from '../../domain/value-objects/site-name';
import { CanonicalDomain } from '../../domain/value-objects/canonical-domain';
import { DomainAliases } from '../../domain/value-objects/domain-aliases';
import { CompanySites } from '../../domain/value-objects/company-sites';

@CommandHandler(CreateCompanyWithAdminCommand)
export class CreateCompanyWithAdminCommandHandler
  implements ICommandHandler<CreateCompanyWithAdminCommand>
{
  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepository: CompanyRepository,
    private readonly publisher: EventPublisher,
    private readonly eventBus: EventBus,
  ) {}

  // Maneja la creación de la compañía y el usuario administrador asociado
  async execute(command: CreateCompanyWithAdminCommand): Promise<void> {
    // Extrae las propiedades del objeto props
    const { companyName, sites, adminName, adminEmail, adminTel } =
      command.props;
    // 1. Crear la compañía
    const companyId = Uuid.random();
    const userId = Uuid.random();
    const now = new Date();

    // Crear sites a partir de los primitivos recibidos
    const siteEntities = sites.map((siteData) => {
      return Site.create({
        id: siteData.id ? new SiteId(siteData.id) : SiteId.random(),
        name: new SiteName(siteData.name),
        canonicalDomain: new CanonicalDomain(siteData.canonicalDomain),
        domainAliases: DomainAliases.fromPrimitives(siteData.domainAliases),
      });
    });

    const company = Company.create({
      id: companyId,
      companyName: new CompanyName(companyName),
      sites: CompanySites.fromSiteArray(siteEntities),
      createdAt: now,
      updatedAt: now,
    });

    // 2. Persistir el agregado y publicar eventos
    const companyAggregate = this.publisher.mergeObjectContext(company);
    await this.companyRepository.save(companyAggregate);
    companyAggregate.commit();

    // 3. Publicar evento de integración para que el contexto de usuarios gestione el admin
    this.eventBus.publish(
      new CompanyCreatedWithAdminEvent({
        companyId: companyId.getValue(),
        companyName,
        sites: siteEntities.map((site) => {
          const primitives = site.toPrimitives();
          return {
            id: primitives.id,
            name: primitives.name,
            canonicalDomain: primitives.canonicalDomain,
            domainAliases: primitives.domainAliases,
          };
        }),
        adminName,
        adminEmail: adminEmail ?? null,
        adminTel: adminTel ?? null,
        createdAt: now.toISOString(),
        userId: userId.getValue(),
      }),
    );
  }
}
