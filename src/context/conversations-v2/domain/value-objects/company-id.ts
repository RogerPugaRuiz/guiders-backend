import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

/**
 * Value object para el identificador único de la empresa en el contexto conversations-v2
 * Extiende de Uuid para garantizar unicidad y formato válido
 */
export class CompanyId {
  private constructor(private readonly _value: Uuid) {}

  /**
   * Crea un nuevo CompanyId a partir de un string UUID
   */
  static create(value?: string): CompanyId {
    if (value === undefined || value === null) {
      return new CompanyId(Uuid.random());
    }
    return new CompanyId(
      Uuid.create(
        value,
        (v: string) => Uuid.validate(v),
        'Invalid Uuid format',
      ),
    );
  }

  /**
   * Genera un nuevo CompanyId con UUID aleatorio
   */
  static generate(): CompanyId {
    return new CompanyId(Uuid.random());
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
   * Compara dos CompanyId para igualdad
   */
  equals(other: CompanyId): boolean {
    return this._value.value === other._value.value;
  }

  /**
   * Convierte a string para serialización
   */
  toString(): string {
    return this._value.value;
  }
}
