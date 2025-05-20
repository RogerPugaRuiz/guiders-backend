import { AggregateRoot } from '@nestjs/cqrs';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import { VisitorId } from './value-objects/visitor-id';
import { IntentType } from './value-objects/intent-type';
import { IntentConfidence } from './value-objects/intent-confidence';
// Ajuste de importación: ruta relativa correcta para el evento
import { IntentDetectedEvent } from './events/intent-detected-event';

// Interfaz para serializar la entidad a primitivos
export interface VisitorIntentPrimitives {
  id: string;
  visitorId: string;
  type: string;
  confidence: string;
  detectedAt: string; // ISO string
}

export interface VisitorIntentProperties {
  id: Uuid;
  visitorId: VisitorId;
  type: IntentType;
  confidence: IntentConfidence;
  detectedAt: Date;
}

// Entidad VisitorIntent como AggregateRoot siguiendo DDD
export class VisitorIntent extends AggregateRoot {
  private constructor(
    private readonly _id: Uuid,
    private readonly _visitorId: VisitorId,
    private readonly _type: IntentType,
    private readonly _confidence: IntentConfidence,
    private readonly _detectedAt: Date,
  ) {
    super();
  }

  // Método de fábrica para crear una intención y emitir evento
  public static create(props: VisitorIntentProperties): VisitorIntent {
    const intent = new VisitorIntent(
      props.id,
      props.visitorId,
      props.type,
      props.confidence,
      props.detectedAt,
    );
    intent.apply(
      new IntentDetectedEvent({
        intent: intent.toPrimitives(),
      }),
    );
    return intent;
  }

  // Método de fábrica para reconstruir desde datos primitivos
  public static fromPrimitives(params: VisitorIntentPrimitives): VisitorIntent {
    return new VisitorIntent(
      Uuid.create(params.id),
      VisitorId.create(params.visitorId),
      new IntentType(params.type),
      new IntentConfidence(params.confidence),
      new Date(params.detectedAt),
    );
  }

  // Serializa la entidad a un objeto plano
  public toPrimitives(): VisitorIntentPrimitives {
    return {
      id: this._id.value,
      visitorId: this._visitorId.value,
      type: this._type.value,
      confidence: this._confidence.value,
      detectedAt: this._detectedAt.toISOString(),
    };
  }

  // Getters de solo lectura
  get id(): Uuid {
    return this._id;
  }
  get visitorId(): VisitorId {
    return this._visitorId;
  }
  get type(): IntentType {
    return this._type;
  }
  get confidence(): IntentConfidence {
    return this._confidence;
  }
  get detectedAt(): Date {
    return this._detectedAt;
  }
}
