import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Value Object para el estado activo/inactivo de un usuario
export class UserAccountIsActive extends PrimitiveValueObject<boolean> {
  constructor(value: boolean) {
    super(
      value,
      (v) => typeof v === 'boolean',
      'El estado activo debe ser booleano',
    );
  }
}
