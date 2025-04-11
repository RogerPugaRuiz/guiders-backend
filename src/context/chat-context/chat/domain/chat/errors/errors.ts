import { DomainError } from 'src/context/shared/domain/domain.error';

export class RegisterChatError extends DomainError {}

export class ChatNotFoundError extends DomainError {
  protected name: string = 'ChatNotFoundError';
  constructor() {
    super('Chat not found');
  }
}

export class ChatCanNotSaveMessageError extends DomainError {
  protected name: string = 'ChatCanNotSaveMessageError';
  constructor() {
    super('Chat can not save message');
  }
}
