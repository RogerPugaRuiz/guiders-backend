import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Valida que la URL sea un string válido o null
const validateLastVisitedUrl = (value: string | null): boolean => {
  if (value === null) return true;
  // Se eliminan los escapes innecesarios en el regex
  const urlRegex =
    /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-._~:/?#[\]@!$&'()*+,;=]*)?$/;
  return urlRegex.test(value);
};

// Value Object para la última URL visitada por el visitante
export class TrackingVisitorLastVisitedUrl extends PrimitiveValueObject<
  string | null
> {
  constructor(value: string | null) {
    super(
      value,
      validateLastVisitedUrl,
      'TrackingVisitorLastVisitedUrl debe ser una URL válida o null',
    );
  }
}
