import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import { ValidationError } from 'src/context/shared/domain/validation.error';

/**
 * Value object para el identificador del visitante
 */
export class VisitorId {
  private constructor(private readonly _value: Uuid) {}

  /**
   * Crea un nuevo VisitorId a partir de un string UUID
   */
  static create(value?: string): VisitorId {
    if (!value || value.trim() === '') {
      throw new ValidationError('Visitor ID debe ser un UUID válido');
    }
    
    try {
      return new VisitorId(Uuid.create(value));
    } catch {
      throw new ValidationError('Visitor ID debe ser un UUID válido');
    }
  }

  /**
   * Genera un nuevo VisitorId con UUID aleatorio
   */
  static generate(): VisitorId {
    return new VisitorId(Uuid.random());
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
   * Compara dos VisitorId para igualdad
   */
  equals(other: VisitorId): boolean {
    return this._value.value === other._value.value;
  }

  /**
   * Convierte a string para serialización
   */
  toString(): string {
    return this._value.value;
  }
}
