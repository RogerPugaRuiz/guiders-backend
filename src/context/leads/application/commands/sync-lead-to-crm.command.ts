import { ICommand } from '@nestjs/cqrs';
import { CrmType } from '../../domain/services/crm-sync.service';

export interface SyncLeadToCrmInput {
  visitorId: string;
  companyId: string;
  crmType?: CrmType; // Si no se especifica, se sincronizan todos los CRMs habilitados
}

export class SyncLeadToCrmCommand implements ICommand {
  constructor(public readonly input: SyncLeadToCrmInput) {}
}
