import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Objeto de valor para la página actual que está viendo el visitante
// Valida que la página sea un string no vacío
const validateCurrentPage = (value: string) =>
  typeof value === 'string' && value.trim().length > 0;

export class VisitorCurrentPage extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(value, validateCurrentPage, 'La página actual no puede estar vacía');
  }
}
