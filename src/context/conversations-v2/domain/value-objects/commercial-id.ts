import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import { ValidationError } from 'src/context/shared/domain/validation.error';

/**
 * Value object para el identificador del comercial
 */
export class CommercialId {
  private constructor(private readonly _value: Uuid) {}

  /**
   * Crea un nuevo CommercialId a partir de un string UUID
   */
  static create(value?: string): CommercialId {
    if (!value || value.trim() === '') {
      throw new ValidationError('Commercial ID debe ser un UUID válido');
    }

    try {
      return new CommercialId(Uuid.create(value));
    } catch {
      throw new ValidationError('Commercial ID debe ser un UUID válido');
    }
  }

  /**
   * Genera un nuevo CommercialId con UUID aleatorio
   */
  static generate(): CommercialId {
    return new CommercialId(Uuid.random());
  }

  /**
   * Obtiene el valor del ID como string
   */
  getValue(): string {
    return this._value.value;
  }

  /**
   * Alias para getValue para compatibilidad
   */
  get value(): string {
    return this.getValue();
  }

  /**
   * Compara dos CommercialId para igualdad
   */
  equals(other: CommercialId): boolean {
    return this._value.value === other._value.value;
  }

  /**
   * Convierte a string para serialización
   */
  toString(): string {
    return this._value.value;
  }
}
