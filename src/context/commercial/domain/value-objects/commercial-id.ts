import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

/**
 * Value Object para el identificador del comercial
 * Encapsula un UUID que identifica únicamente a un comercial
 */
const isValidUuid = (value: string): boolean => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

export class CommercialId extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(value, isValidUuid, 'El ID del comercial debe ser un UUID válido');
  }
}
