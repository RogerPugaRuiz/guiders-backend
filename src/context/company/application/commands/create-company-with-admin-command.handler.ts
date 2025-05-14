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
import { CompanyDomain } from '../../domain/value-objects/company-domain';
import { Result, ok } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { CompanyCreatedWithAdminEvent } from '../../domain/events/company-created-with-admin.event';

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
  async execute(
    command: CreateCompanyWithAdminCommand,
  ): Promise<Result<void, DomainError>> {
    // Extrae las propiedades del objeto props
    const { companyName, domain, adminName, adminEmail, adminTel } =
      command.props;
    // 1. Crear la compañía
    const companyId = Uuid.random();
    const userId = Uuid.random();
    const now = new Date();
    const company = Company.create({
      id: companyId,
      companyName: CompanyName.create(companyName),
      domain: CompanyDomain.create(domain),
      createdAt: now,
      updatedAt: now,
    });

    // 2. Persistir el agregado
    await this.companyRepository.save(company);
    // 3. Publicar evento de integración para que el contexto de usuarios gestione el admin
    this.publisher.mergeObjectContext(company).commit();
    this.eventBus.publish(
      new CompanyCreatedWithAdminEvent({
        companyId: companyId.getValue(),
        companyName,
        domain,
        adminName,
        adminEmail: adminEmail ?? null,
        adminTel: adminTel ?? null,
        createdAt: now.toISOString(),
        userId: userId.getValue(),
      }),
    );
    return ok(undefined);
  }
}
