import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { CompanyCreatedEvent } from 'src/context/company/domain/events/company-created.event';
import { CreateApiKeyForDomainUseCase } from '../usecase/create-api-key-for-domain.usecase';
import { Injectable, Logger } from '@nestjs/common';
import { ApiKeyDomain } from '../../domain/model/api-key-domain';
import { ApiKeyCompanyId } from '../../domain/model/api-key-company-id';

// Handler que reacciona al evento CompanyCreatedEvent y crea una API Key para el dominio principal de la empresa
@Injectable()
@EventsHandler(CompanyCreatedEvent)
export class CreateApiKeyOnCompanyCreatedEventHandler
  implements IEventHandler<CompanyCreatedEvent>
{
  private readonly logger = new Logger(
    CreateApiKeyOnCompanyCreatedEventHandler.name,
  );

  constructor(
    private readonly createApiKeyForDomainUseCase: CreateApiKeyForDomainUseCase,
  ) {}

  // Maneja el evento de creación de empresa
  async handle(event: CompanyCreatedEvent): Promise<void> {
    // Se obtienen todos los dominios de todos los sitios de la empresa
    const sites = event.attributes.sites;
    const companyId = event.attributes.id;

    if (!sites || sites.length === 0) {
      this.logger.warn(
        `No se encontraron sitios para la empresa ${companyId}, no se crearán API Keys.`,
      );
      return;
    }

    // Extraer todos los dominios (canónicos + aliases) de todos los sitios
    const allDomains: string[] = [];
    for (const site of sites) {
      // Agregar dominio canónico
      allDomains.push(site.canonicalDomain);
      // Agregar aliases
      allDomains.push(...site.domainAliases);
    }

    if (allDomains.length === 0) {
      this.logger.warn(
        `No se encontraron dominios en los sitios para la empresa ${companyId}, no se crearán API Keys.`,
      );
      return;
    }

    // Crear API Key para cada dominio
    for (const domain of allDomains) {
      try {
        await this.createApiKeyForDomainUseCase.execute(
          ApiKeyDomain.create(domain),
          ApiKeyCompanyId.create(companyId),
        );
        this.logger.log(
          `API Key creada para la empresa ${companyId} y dominio ${domain}`,
        );
      } catch (error) {
        this.logger.error(
          `Error al crear API Key para la empresa ${companyId} y dominio ${domain}: ${error}`,
        );
      }
    }
  }
}
