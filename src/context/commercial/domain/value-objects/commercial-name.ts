import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

/**
 * Value Object para el nombre del comercial
 * Encapsula el nombre con validaciones básicas
 */
const isValidName = (value: string): boolean => {
  return (
    typeof value === 'string' && value.trim().length > 0 && value.length <= 100
  );
};

export class CommercialName extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(
      value,
      isValidName,
      'El nombre del comercial debe tener entre 1 y 100 caracteres',
    );
  }
}
