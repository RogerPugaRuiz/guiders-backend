import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Objeto de valor para los metadatos del evento de tracking
// Valida que los metadatos sean un objeto
const validateMetadata = (value: Record<string, any>) =>
  value !== null && typeof value === 'object';

export class TrackingEventMetadata extends PrimitiveValueObject<
  Record<string, any>
> {
  constructor(value: Record<string, any>) {
    super(value, validateMetadata, 'Los metadatos deben ser un objeto');
  }
}
