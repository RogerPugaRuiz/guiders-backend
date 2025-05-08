import { Optional } from 'src/context/shared/domain/optional';
import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';
import { validateEmail } from 'src/context/shared/domain/validation-utils';

// Objeto de valor para el email del visitante
// Valida que el email tenga formato correcto
export class VisitorEmail extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(
      value,
      (email: string) => validateEmail(email),
      'Invalid email format',
    );
  }

  // Método de fábrica para Optional<VisitorEmail>
  static optional(value: string | null | undefined): Optional<VisitorEmail> {
    if (!value || value.trim() === '') {
      return Optional.empty<VisitorEmail>();
    }
    return Optional.of(new VisitorEmail(value));
  }
}
