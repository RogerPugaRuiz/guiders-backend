import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Objeto de valor para el rango de precio asociado a la intención
export class IntentPriceRange extends PrimitiveValueObject<{
  min: number;
  max: number;
}> {
  constructor(value: { min: number; max: number }) {
    if (
      typeof value !== 'object' ||
      typeof value.min !== 'number' ||
      typeof value.max !== 'number' ||
      value.min < 0 ||
      value.max < value.min
    ) {
      throw new Error('IntentPriceRange debe tener min >= 0 y max >= min');
    }
    super(value);
  }

  // Devuelve el rango como string para visualización
  public toString(): string {
    return `${this.value.min} - ${this.value.max}`;
  }
}
