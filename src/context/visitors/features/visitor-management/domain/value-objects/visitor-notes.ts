import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';
import { VisitorNote } from './visitor-note';

// Value Object que representa la colección de notas de un visitante.
// Garantiza inmutabilidad y que todas las notas sean válidas.
export class VisitorNotes extends PrimitiveValueObject<VisitorNote[]> {
  constructor(value: VisitorNote[]) {
    if (
      !Array.isArray(value) ||
      value.some((note) => !(note instanceof VisitorNote))
    ) {
      throw new Error('VisitorNotes debe ser un array de VisitorNote');
    }
    super([...value]); // Inmutabilidad defensiva
  }

  // Devuelve los valores primitivos de las notas
  public toPrimitives(): string[] {
    return this.value.map((note) => note.value);
  }

  // Crea desde primitivos
  public static fromPrimitives(notes: string[]): VisitorNotes {
    return new VisitorNotes(notes.map((note) => new VisitorNote(note)));
  }
}
