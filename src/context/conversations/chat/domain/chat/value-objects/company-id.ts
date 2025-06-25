import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Value object para identificar una compañía en el contexto de chat
// Valida que el valor sea un string no vacío
export class CompanyId extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(
      value,
      (v) => typeof v === 'string' && v.trim().length > 0,
      'CompanyId debe ser un string no vacío',
    );
  }
}
