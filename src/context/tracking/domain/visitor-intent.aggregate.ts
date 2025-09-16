import { AggregateRoot } from '@nestjs/cqrs';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import { VisitorId } from './value-objects/visitor-id';
import { IntentType } from './value-objects/intent-type';
import { IntentConfidence } from './value-objects/intent-confidence';
import { IntentTag } from './value-objects/intent-tag';
import { IntentPriceRange } from './value-objects/intent-price-range';
import { NavigationPath } from './value-objects/navigation-path';
// Ajuste de importación: ruta relativa correcta para el evento
import { IntentDetectedEvent } from './events/intent-detected-event';

// Interfaz para serializar la entidad a primitivos
export interface VisitorIntentPrimitives {
  id: string;
  visitorId: string;
  type: string;
  confidence: string;
  detectedAt: string; // ISO string
  tags?: string[];
  priceRange?: { min: number; max: number };
  navigationPath?: string[];
  description?: string;
}

export interface VisitorIntentProperties {
  id: Uuid;
  visitorId: VisitorId;
  type: IntentType;
  confidence: IntentConfidence;
  detectedAt: Date;
  tags?: IntentTag[];
  priceRange?: IntentPriceRange;
  navigationPath?: NavigationPath;
  description?: string;
}

// Interfaz para serializar la entidad a primitivos extendidos
export interface VisitorIntentDetailedPrimitives {
  id: string;
  visitorId: string;
  type: string;
  confidence: string;
  detectedAt: string;
  tags?: string[];
  priceRange?: { min: number; max: number };
  navigationPath?: string[];
  description?: string;
}

// Entidad VisitorIntent como AggregateRoot siguiendo DDD
export class VisitorIntent extends AggregateRoot {
  private readonly _tags?: IntentTag[];
  private readonly _priceRange?: IntentPriceRange;
  private readonly _navigationPath?: NavigationPath;
  private readonly _description?: string;

  private constructor(
    private readonly _id: Uuid,
    private readonly _visitorId: VisitorId,
    private readonly _type: IntentType,
    private readonly _confidence: IntentConfidence,
    private readonly _detectedAt: Date,
    tags?: IntentTag[],
    priceRange?: IntentPriceRange,
    navigationPath?: NavigationPath,
    description?: string,
  ) {
    super();
    this._id = _id;
    this._visitorId = _visitorId;
    this._type = _type;
    this._confidence = _confidence;
    this._detectedAt = _detectedAt;
    this._tags = tags;
    this._priceRange = priceRange;
    this._navigationPath = navigationPath;
    this._description = description;
  }

  // Método de fábrica para crear una intención y emitir evento
  public static create(props: VisitorIntentProperties): VisitorIntent {
    const intent = new VisitorIntent(
      props.id,
      props.visitorId,
      props.type,
      props.confidence,
      props.detectedAt,
      props.tags,
      props.priceRange,
      props.navigationPath,
      props.description,
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
      params.tags ? params.tags.map((t) => new IntentTag(t)) : undefined,
      params.priceRange ? new IntentPriceRange(params.priceRange) : undefined,
      params.navigationPath
        ? NavigationPath.fromPrimitives(params.navigationPath)
        : undefined,
      params.description,
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
      tags: this._tags ? this._tags.map((t) => t.value) : undefined,
      priceRange: this._priceRange ? this._priceRange.value : undefined,
      navigationPath: this._navigationPath
        ? this._navigationPath.toPrimitives()
        : undefined,
      description: this._description,
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
  get tags(): IntentTag[] | undefined {
    return this._tags;
  }
  get priceRange(): IntentPriceRange | undefined {
    return this._priceRange;
  }
  get navigationPath(): NavigationPath | undefined {
    return this._navigationPath;
  }
  get description(): string | undefined {
    return this._description;
  }
}
