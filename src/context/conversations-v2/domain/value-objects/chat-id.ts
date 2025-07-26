import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

/**
 * Value object para el identificador único del chat V2
 * Extiende de Uuid para garantizar unicidad y formato válido
 */
export class ChatId {
  private constructor(private readonly _value: Uuid) {}

  /**
   * Crea un nuevo ChatId a partir de un string UUID
   */
  static create(value?: string): ChatId {
    if (value === undefined || value === null) {
      return new ChatId(Uuid.random());
    }
    return new ChatId(
      Uuid.create(
        value,
        (v: string) => Uuid.validate(v),
        'Invalid Uuid format',
      ),
    );
  }

  /**
   * Genera un nuevo ChatId con UUID aleatorio
   */
  static generate(): ChatId {
    return new ChatId(Uuid.random());
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
   * Compara dos ChatId para igualdad
   */
  equals(other: ChatId): boolean {
    return this._value.value === other._value.value;
  }

  /**
   * Convierte a string para serialización
   */
  toString(): string {
    return this._value.value;
  }
}
