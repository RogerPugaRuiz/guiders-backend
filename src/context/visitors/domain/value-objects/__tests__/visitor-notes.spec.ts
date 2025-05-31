import { VisitorNotes } from '../visitor-notes';
import { VisitorNote } from '../visitor-note';

describe('VisitorNotes', () => {
  it('should create empty notes collection', () => {
    const notes = new VisitorNotes([]);
    expect(notes.value).toEqual([]);
    expect(notes.toPrimitives()).toEqual([]);
  });

  it('should create notes collection with valid notes', () => {
    const note1 = new VisitorNote('First note');
    const note2 = new VisitorNote('Second note');
    const notes = new VisitorNotes([note1, note2]);

    expect(notes.value).toHaveLength(2);
    expect(notes.value[0]).toBe(note1);
    expect(notes.value[1]).toBe(note2);
  });

  it('should return primitive values', () => {
    const note1 = new VisitorNote('First note');
    const note2 = new VisitorNote('Second note');
    const notes = new VisitorNotes([note1, note2]);

    const primitives = notes.toPrimitives();
    expect(primitives).toEqual(['First note', 'Second note']);
  });

  it('should create from primitives', () => {
    const primitiveNotes = ['Note one', 'Note two', 'Note three'];
    const notes = VisitorNotes.fromPrimitives(primitiveNotes);

    expect(notes.value).toHaveLength(3);
    expect(notes.toPrimitives()).toEqual(primitiveNotes);
  });

  it('should maintain immutability - defensive copy', () => {
    const note1 = new VisitorNote('Original note');
    const originalArray = [note1];
    const notes = new VisitorNotes(originalArray);

    // Modificar el array original no debe afectar el value object
    originalArray.push(new VisitorNote('Added note'));
    expect(notes.value).toHaveLength(1);
  });

  it('should throw error for non-array input', () => {
    expect(
      () => new VisitorNotes('not an array' as unknown as VisitorNote[]),
    ).toThrow('VisitorNotes debe ser un array de VisitorNote');
    expect(() => new VisitorNotes(null as unknown as VisitorNote[])).toThrow(
      'VisitorNotes debe ser un array de VisitorNote',
    );
    expect(
      () => new VisitorNotes(undefined as unknown as VisitorNote[]),
    ).toThrow('VisitorNotes debe ser un array de VisitorNote');
  });

  it('should throw error for array with invalid notes', () => {
    const invalidArray = [
      new VisitorNote('Valid'),
      'invalid',
      new VisitorNote('Also valid'),
    ];
    expect(
      () => new VisitorNotes(invalidArray as unknown as VisitorNote[]),
    ).toThrow('VisitorNotes debe ser un array de VisitorNote');
  });

  it('should handle array with only invalid objects', () => {
    const invalidArray = ['string', 123, {}];
    expect(
      () => new VisitorNotes(invalidArray as unknown as VisitorNote[]),
    ).toThrow('VisitorNotes debe ser un array de VisitorNote');
  });

  it('should create from empty primitives array', () => {
    const notes = VisitorNotes.fromPrimitives([]);
    expect(notes.value).toEqual([]);
    expect(notes.toPrimitives()).toEqual([]);
  });
});
