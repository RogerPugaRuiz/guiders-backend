import { ICommand } from '@nestjs/cqrs';
import { CrmType, ChatSyncData } from '../../domain/services/crm-sync.service';

export interface SyncChatToCrmInput {
  chatId: string;
  visitorId: string;
  companyId: string;
  messages: ChatSyncData['messages'];
  startedAt: Date;
  closedAt?: Date;
  summary?: string;
  crmType?: CrmType; // Si no se especifica, se sincronizan todos los CRMs habilitados
}

export class SyncChatToCrmCommand implements ICommand {
  constructor(public readonly input: SyncChatToCrmInput) {}
}
