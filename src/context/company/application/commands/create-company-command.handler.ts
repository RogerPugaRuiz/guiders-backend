// Handler para el comando CreateCompanyCommand siguiendo DDD + CQRS
import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { CreateCompanyCommand } from './create-company.command';
import {
  COMPANY_REPOSITORY,
  CompanyRepository,
} from '../../domain/company.repository';
import { Company } from '../../domain/company';
import { CompanyName } from '../../domain/value-objects/company-name';
import { CompanyDomain } from '../../domain/value-objects/company-domain';
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
    const { companyName, domain } = command.params;
    // Se crea la entidad de dominio Company
    const company = Company.create({
      id: Uuid.random(),
      companyName: new CompanyName(companyName),
      domain: new CompanyDomain(domain),
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
