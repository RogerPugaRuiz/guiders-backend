import { DomainEvent } from 'src/context/shared/domain/domain-event';
import { CrmType } from '../services/crm-sync.service';

/**
 * Payload del evento de sincronización de lead con CRM
 */
export interface LeadSyncedToCrmEventPayload {
  readonly visitorId: string;
  readonly companyId: string;
  readonly crmType: CrmType;
  readonly externalLeadId: string;
  readonly syncedAt: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Evento de dominio: Lead sincronizado con CRM
 */
export class LeadSyncedToCrmEvent extends DomainEvent<LeadSyncedToCrmEventPayload> {
  static readonly eventName = 'leads.lead.synced';

  constructor(payload: LeadSyncedToCrmEventPayload) {
    super(payload);
  }

  getVisitorId(): string {
    return this.attributes.visitorId;
  }

  getCompanyId(): string {
    return this.attributes.companyId;
  }

  getCrmType(): CrmType {
    return this.attributes.crmType;
  }

  getExternalLeadId(): string {
    return this.attributes.externalLeadId;
  }

  getSyncedAt(): Date {
    return new Date(this.attributes.syncedAt);
  }

  getMetadata(): Record<string, unknown> | undefined {
    return this.attributes.metadata;
  }
}

/**
 * Payload del evento de sincronización de chat con CRM
 */
export interface ChatSyncedToCrmEventPayload {
  readonly chatId: string;
  readonly visitorId: string;
  readonly companyId: string;
  readonly crmType: CrmType;
  readonly externalLeadId: string;
  readonly syncedAt: string;
}

/**
 * Evento de dominio: Chat sincronizado con CRM
 */
export class ChatSyncedToCrmEvent extends DomainEvent<ChatSyncedToCrmEventPayload> {
  static readonly eventName = 'leads.chat.synced';

  constructor(payload: ChatSyncedToCrmEventPayload) {
    super(payload);
  }

  getChatId(): string {
    return this.attributes.chatId;
  }

  getVisitorId(): string {
    return this.attributes.visitorId;
  }

  getCompanyId(): string {
    return this.attributes.companyId;
  }

  getCrmType(): CrmType {
    return this.attributes.crmType;
  }

  getExternalLeadId(): string {
    return this.attributes.externalLeadId;
  }

  getSyncedAt(): Date {
    return new Date(this.attributes.syncedAt);
  }
}

/**
 * Payload del evento de fallo de sincronización
 */
export interface LeadSyncFailedEventPayload {
  readonly visitorId: string;
  readonly companyId: string;
  readonly crmType: CrmType;
  readonly errorCode: string;
  readonly errorMessage: string;
  readonly retryCount: number;
  readonly failedAt: string;
}

/**
 * Evento de dominio: Fallo en sincronización con CRM
 */
export class LeadSyncFailedEvent extends DomainEvent<LeadSyncFailedEventPayload> {
  static readonly eventName = 'leads.sync.failed';

  constructor(payload: LeadSyncFailedEventPayload) {
    super(payload);
  }

  getVisitorId(): string {
    return this.attributes.visitorId;
  }

  getCompanyId(): string {
    return this.attributes.companyId;
  }

  getCrmType(): CrmType {
    return this.attributes.crmType;
  }

  getErrorCode(): string {
    return this.attributes.errorCode;
  }

  getErrorMessage(): string {
    return this.attributes.errorMessage;
  }

  getRetryCount(): number {
    return this.attributes.retryCount;
  }

  getFailedAt(): Date {
    return new Date(this.attributes.failedAt);
  }
}

/**
 * Payload del evento de datos de contacto guardados
 */
export interface LeadContactDataSavedEventPayload {
  readonly visitorId: string;
  readonly companyId: string;
  readonly hasEmail: boolean;
  readonly hasTelefono: boolean;
  readonly extractedFromChatId?: string;
  readonly savedAt: string;
}

/**
 * Evento de dominio: Datos de contacto del lead guardados
 */
export class LeadContactDataSavedEvent extends DomainEvent<LeadContactDataSavedEventPayload> {
  static readonly eventName = 'leads.contact-data.saved';

  constructor(payload: LeadContactDataSavedEventPayload) {
    super(payload);
  }

  getVisitorId(): string {
    return this.attributes.visitorId;
  }

  getCompanyId(): string {
    return this.attributes.companyId;
  }

  hasEmail(): boolean {
    return this.attributes.hasEmail;
  }

  hasTelefono(): boolean {
    return this.attributes.hasTelefono;
  }

  getExtractedFromChatId(): string | undefined {
    return this.attributes.extractedFromChatId;
  }

  getSavedAt(): Date {
    return new Date(this.attributes.savedAt);
  }
}
