import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';
import { validateStringNotEmpty } from 'src/context/shared/domain/validation-utils';
import { Optional } from 'src/context/shared/domain/optional';

// Objeto de valor para el nombre del visitante
// Valida que el nombre no sea vacío
export class VisitorName extends PrimitiveValueObject<string> {
  constructor(value: string) {
    validateStringNotEmpty(value);
    super(value);
  }

  // Método de fábrica para Optional<VisitorName>
  static optional(value: string | null | undefined): Optional<VisitorName> {
    if (!value || value.trim() === '') {
      return Optional.empty<VisitorName>();
    }
    return Optional.of(new VisitorName(value));
  }
}
