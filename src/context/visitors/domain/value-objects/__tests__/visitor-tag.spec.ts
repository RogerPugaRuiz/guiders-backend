import { VisitorTag } from '../visitor-tag';

describe('VisitorTag', () => {
  it('should create a valid visitor tag', () => {
    const tagValue = 'VIP';
    const tag = new VisitorTag(tagValue);

    expect(tag.value).toBe(tagValue);
  });

  it('should accept tag with spaces', () => {
    const tagValue = '  Important Customer  ';
    const tag = new VisitorTag(tagValue);

    expect(tag.value).toBe(tagValue);
  });

  it('should throw error for empty string', () => {
    expect(() => new VisitorTag('')).toThrow(
      'VisitorTag debe ser un string no vacío',
    );
  });

  it('should throw error for string with only spaces', () => {
    expect(() => new VisitorTag('   ')).toThrow(
      'VisitorTag debe ser un string no vacío',
    );
  });

  it('should throw error for non-string value', () => {
    expect(() => new VisitorTag(123 as unknown as string)).toThrow(
      'VisitorTag debe ser un string no vacío',
    );
    expect(() => new VisitorTag(null as unknown as string)).toThrow(
      'VisitorTag debe ser un string no vacío',
    );
    expect(() => new VisitorTag(undefined as unknown as string)).toThrow(
      'VisitorTag debe ser un string no vacío',
    );
  });

  it('should accept single character tags', () => {
    const tag = new VisitorTag('A');
    expect(tag.value).toBe('A');
  });

  it('should accept tags with special characters', () => {
    const specialTag = 'high-priority-customer';
    const tag = new VisitorTag(specialTag);

    expect(tag.value).toBe(specialTag);
  });

  it('should accept numeric strings as tags', () => {
    const numericTag = '2024';
    const tag = new VisitorTag(numericTag);

    expect(tag.value).toBe(numericTag);
  });
});
