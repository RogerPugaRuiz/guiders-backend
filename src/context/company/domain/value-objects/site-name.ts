import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Objeto de valor para el nombre de un sitio web
// Valida que sea un string no vacío con longitud adecuada
const validateSiteName = (value: string) =>
  typeof value === 'string' &&
  value.trim().length > 0 &&
  value.trim().length <= 100;

export class SiteName extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(
      value.trim(),
      validateSiteName,
      'El nombre del sitio debe tener entre 1 y 100 caracteres',
    );
  }
}
