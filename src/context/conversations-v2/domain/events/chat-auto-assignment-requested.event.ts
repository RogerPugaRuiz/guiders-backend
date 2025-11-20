import { DomainEvent } from '../../../shared/domain/domain-event';

/**
 * Datos del evento de auto-asignación de chat
 */
export interface ChatAutoAssignmentRequestedEventData {
  autoAssignment: {
    chatId: string;
    visitorId: string;
    availableCommercialIds: string[];
    priority: string;
    requiredSkills?: string[];
    strategy?: string;
    maxWaitTimeSeconds?: number;
    requestedAt: Date;
    reason: string;
  };
}

/**
 * Evento disparado cuando se solicita auto-asignación de un chat
 * Este evento trigger el proceso automático de selección de comercial
 */
export class ChatAutoAssignmentRequestedEvent extends DomainEvent<ChatAutoAssignmentRequestedEventData> {
  constructor(data: ChatAutoAssignmentRequestedEventData) {
    super(data);
  }

  static eventName = 'chat.v2.auto_assignment_requested';
}
