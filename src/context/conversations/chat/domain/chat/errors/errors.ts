import { DomainError } from 'src/context/shared/domain/domain.error';

export class RegisterChatError extends DomainError {}

export class ChatNotFoundError extends DomainError {
  constructor() {
    super('Chat not found');
    this.name = 'ChatNotFoundError';
  }
}

export class ChatCanNotSaveMessageError extends DomainError {
  constructor() {
    super('Chat can not save message');
    this.name = 'ChatCanNotSaveMessageError';
  }
}

export class ParticipantNotFoundError extends DomainError {
  constructor() {
    super('Participant not found');
    this.name = 'ParticipantNotFoundError';
  }
}

export class ParticipantNotCommercialError extends DomainError {
  constructor() {
    super('Participant is not a commercial');
    this.name = 'ParticipantNotCommercialError';
  }
}
