// Evento de integración para la creación de una compañía con admin
// Ubicación: src/context/company/domain/events/company-created-with-admin.event.ts
import { DomainEvent } from 'src/context/shared/domain/domain-event';

export interface CompanyCreatedWithAdminPayload {
  companyId: string;
  companyName: string;
  domain: string;
  adminName: string;
  adminEmail: string | null;
  adminTel: string | null;
  createdAt: string;
  userId: string;
}

export class CompanyCreatedWithAdminEvent extends DomainEvent<CompanyCreatedWithAdminPayload> {}
