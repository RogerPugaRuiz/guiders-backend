import { VisitorNote } from '../visitor-note';

describe('VisitorNote', () => {
  it('should create a valid visitor note', () => {
    const noteValue = 'This is a valid note';
    const note = new VisitorNote(noteValue);

    expect(note.value).toBe(noteValue);
  });

  it('should trim the note value and accept it if not empty', () => {
    const noteValue = '  Valid note with spaces  ';
    const note = new VisitorNote(noteValue);

    expect(note.value).toBe(noteValue);
  });

  it('should throw error for empty string', () => {
    expect(() => new VisitorNote('')).toThrow('VisitorNote debe ser un string no vacío');
  });

  it('should throw error for string with only spaces', () => {
    expect(() => new VisitorNote('   ')).toThrow('VisitorNote debe ser un string no vacío');
  });

  it('should throw error for non-string value', () => {
    expect(() => new VisitorNote(123 as any)).toThrow('VisitorNote debe ser un string no vacío');
    expect(() => new VisitorNote(null as any)).toThrow('VisitorNote debe ser un string no vacío');
    expect(() => new VisitorNote(undefined as any)).toThrow('VisitorNote debe ser un string no vacío');
  });

  it('should accept long notes', () => {
    const longNote = 'This is a very long note that contains multiple sentences and should be perfectly valid as a visitor note since there are no restrictions on length.';
    const note = new VisitorNote(longNote);

    expect(note.value).toBe(longNote);
  });

  it('should accept notes with special characters', () => {
    const specialNote = 'Note with special chars: @#$%^&*()_+{}|:"<>?[]\\;\'./';
    const note = new VisitorNote(specialNote);

    expect(note.value).toBe(specialNote);
  });
});