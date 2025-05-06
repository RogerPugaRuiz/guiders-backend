import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Valida que la URL sea un string válido o null
const validateLastVisitedUrl = (value: string | null): boolean => {
  if (value === null) return true;
  // Permitir http en desarrollo y http://localhost/*
  const isDev =
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG === 'True' ||
    process.env.DEBUG === 'true';
  if (isDev && /^http:\/\/localhost(\\:\d+)?(\/.*)?$/.test(value)) {
    return true;
  }
  // Expresión regular mejorada para URLs válidas
  const urlRegex = isDev
    ? /^(https?:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\\:\d+)?(\/[\w\-.~:/?#[\]@!$&'()*+,;=]*)?$/
    : /^(https:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\\:\d+)?(\/[\w\-.~:/?#[\]@!$&'()*+,;=]*)?$/;
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
