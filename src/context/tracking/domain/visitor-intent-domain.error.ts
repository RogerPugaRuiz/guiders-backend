import { DomainError } from 'src/context/shared/domain/domain.error';

// Error específico para la intención del visitante
export class VisitorIntentDomainError extends DomainError {
  constructor(
    message: string = 'Error related to visitor intent domain',
    public details?: string,
  ) {
    super(message);
  }
}
