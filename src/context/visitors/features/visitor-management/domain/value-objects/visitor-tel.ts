import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';
import { validateStringNotEmpty } from 'src/context/shared/domain/validation-utils';
import { Optional } from 'src/context/shared/domain/optional';

const REGEX_PHONE = /^\+?[0-9\s\-()]{7,}$/; // Regex para validar números de teléfono

// Objeto de valor para el teléfono del visitante
// Valida que el teléfono no sea vacío (puedes extender para validación específica)
export class VisitorTel extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(
      value,
      (tel: string) => REGEX_PHONE.test(tel) && validateStringNotEmpty(tel),
      'Invalid phone number format',
    );
  }

  // Método para crear un VisitorTel opcional
  static optional(value: string | null | undefined): Optional<VisitorTel> {
    if (!value || value.trim() === '') {
      return Optional.empty<VisitorTel>();
    }
    return Optional.of(new VisitorTel(value));
  }
}
