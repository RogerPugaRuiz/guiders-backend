import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';
import { VisitorTag } from './visitor-tag';

// Value Object que representa la colección de tags de un visitante.
// Garantiza inmutabilidad y que todos los tags sean válidos.
export class VisitorTags extends PrimitiveValueObject<VisitorTag[]> {
  constructor(value: VisitorTag[]) {
    if (
      !Array.isArray(value) ||
      value.some((tag) => !(tag instanceof VisitorTag))
    ) {
      throw new Error('VisitorTags debe ser un array de VisitorTag');
    }
    super([...value]); // Inmutabilidad defensiva
  }

  // Devuelve los valores primitivos de los tags
  public toPrimitives(): string[] {
    return this.value.map((tag) => tag.value);
  }

  // Crea desde primitivos
  public static fromPrimitives(tags: string[]): VisitorTags {
    return new VisitorTags(tags.map((tag) => new VisitorTag(tag)));
  }
}
