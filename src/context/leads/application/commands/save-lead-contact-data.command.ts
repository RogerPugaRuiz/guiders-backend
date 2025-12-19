import { ICommand } from '@nestjs/cqrs';

export interface SaveLeadContactDataInput {
  visitorId: string;
  companyId: string;
  nombre?: string;
  apellidos?: string;
  email?: string;
  telefono?: string;
  dni?: string;
  poblacion?: string;
  additionalData?: Record<string, unknown>;
  extractedFromChatId?: string;
}

export class SaveLeadContactDataCommand implements ICommand {
  constructor(public readonly input: SaveLeadContactDataInput) {}
}
