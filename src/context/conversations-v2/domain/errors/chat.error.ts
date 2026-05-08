import { DomainError } from 'src/context/shared/domain/domain.error';

/**
 * Error para cuando falta un campo requerido para crear un chat
 */
export class ChatMissingRequiredFieldError extends DomainError {
  constructor(field: string) {
    super(`El campo '${field}' es requerido para crear un chat`);
  }
}
