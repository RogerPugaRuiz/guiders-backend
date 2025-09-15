import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';
import { CanonicalDomain } from './canonical-domain';

// Objeto de valor para la colección de alias de dominio de un sitio
// Puede estar vacío (sin alias) pero todos los alias deben ser válidos
const validateDomainAliases = (value: string[]) =>
  Array.isArray(value) &&
  value.every((alias) => CanonicalDomain.isValid(alias));

export class DomainAliases extends PrimitiveValueObject<string[]> {
  constructor(value: string[]) {
    super(
      value.map((alias) => alias.trim()),
      validateDomainAliases,
      'Todos los alias de dominio deben ser válidos',
    );
  }

  // Permite crear desde array de strings
  public static fromPrimitives(aliases: string[]): DomainAliases {
    return new DomainAliases(aliases);
  }

  // Devuelve los alias como array de strings
  public toPrimitives(): string[] {
    return [...this.value];
  }

  // Verifica si contiene un alias específico
  public contains(alias: string): boolean {
    return this.value.includes(alias);
  }

  // Verifica si está vacío
  public isEmpty(): boolean {
    return this.value.length === 0;
  }

  // Retorna la cantidad de alias
  public size(): number {
    return this.value.length;
  }
}
