import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Valida que el companyId sea un UUID válido
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class ConnectionCompanyId extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(
      value,
      (v) => UUID_REGEX.test(v),
      'El companyId debe ser un UUID válido',
    );
  }
}
