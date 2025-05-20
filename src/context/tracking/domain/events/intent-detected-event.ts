import { DomainEvent } from 'src/context/shared/domain/domain-event';
import { VisitorIntentPrimitives } from '../visitor-intent';

// Evento de dominio que indica que se ha detectado una intención
export class IntentDetectedEvent extends DomainEvent<{
  intent: VisitorIntentPrimitives;
}> {}
