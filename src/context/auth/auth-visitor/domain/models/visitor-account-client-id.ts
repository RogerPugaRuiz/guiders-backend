import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Value Object para el Client ID del visitante.
// Ahora acepta números o strings numéricos ("432482019") y valida que sea entero positivo.
export class VisitorAccountClientID extends PrimitiveValueObject<number> {
  constructor(value: number | string) {
    const numeric = typeof value === 'string' ? Number(value) : value;
    super(
      numeric,
      (v) => typeof v === 'number' && Number.isInteger(v) && v > 0,
      'El Client ID debe ser un entero positivo',
    );
  }
}
