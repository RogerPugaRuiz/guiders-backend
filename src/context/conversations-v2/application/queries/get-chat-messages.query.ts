import { IQuery } from '@nestjs/cqrs';

export interface GetChatMessagesQueryParams {
  chatId: string;
  userId: string;
  userRoles: string[];
  filters?: {
    messageType?: string;
    isInternal?: boolean;
    senderId?: string;
    dateFrom?: string;
    dateTo?: string;
    hasAttachment?: boolean;
  };
  sort?: {
    field?: 'sentAt' | 'readAt' | 'type';
    direction?: 'ASC' | 'DESC';
  };
  cursor?: string;
  limit?: number;
}

/**
 * Query para obtener mensajes de un chat específico
 * Soporta paginación basada en cursor, filtros avanzados y validación de permisos
 */
export class GetChatMessagesQuery implements IQuery {
  constructor(public readonly params: GetChatMessagesQueryParams) {}

  get chatId(): string {
    return this.params.chatId;
  }

  get userId(): string {
    return this.params.userId;
  }

  get userRoles(): string[] {
    return this.params.userRoles;
  }

  get filters() {
    return this.params.filters;
  }

  get sort() {
    return this.params.sort;
  }

  get cursor(): string | undefined {
    return this.params.cursor;
  }

  get limit(): number {
    return this.params.limit || 50;
  }
}
