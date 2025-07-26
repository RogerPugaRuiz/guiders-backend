import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import { ValidationError } from 'src/context/shared/domain/validation.error';

/**
 * Value object para el identificador único del mensaje V2
 */
export class MessageId {
  private constructor(private readonly _value: Uuid) {}

  /**
   * Crea un nuevo MessageId a partir de un string UUID
   */
  static create(value?: string): MessageId {
    if (!value || value.trim() === '') {
      throw new ValidationError('Message ID debe ser un UUID válido');
    }
    
    try {
      return new MessageId(Uuid.create(value));
    } catch {
      throw new ValidationError('Message ID debe ser un UUID válido');
    }
  }

  /**
   * Genera un nuevo MessageId con UUID aleatorio
   */
  static generate(): MessageId {
    return new MessageId(Uuid.random());
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
   * Compara dos MessageId para igualdad
   */
  equals(other: MessageId): boolean {
    return this._value.value === other._value.value;
  }

  /**
   * Convierte a string para serialización
   */
  toString(): string {
    return this._value.value;
  }
}
