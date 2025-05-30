import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Objeto de valor para companyId asociado a la API Key
// Valida que el companyId sea un UUID válido (no vacío)
const validateCompanyId = (value: string) =>
  typeof value === 'string' && value.trim().length > 0;

export class ApiKeyCompanyId extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(
      value,
      validateCompanyId,
      'El companyId de la API Key no puede estar vacío',
    );
  }
}
