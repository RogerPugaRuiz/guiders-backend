import { VisitorTags } from '../visitor-tags';
import { VisitorTag } from '../visitor-tag';

describe('VisitorTags', () => {
  it('should create empty tags collection', () => {
    const tags = new VisitorTags([]);
    expect(tags.value).toEqual([]);
    expect(tags.toPrimitives()).toEqual([]);
  });

  it('should create tags collection with valid tags', () => {
    const tag1 = new VisitorTag('VIP');
    const tag2 = new VisitorTag('Premium');
    const tags = new VisitorTags([tag1, tag2]);

    expect(tags.value).toHaveLength(2);
    expect(tags.value[0]).toBe(tag1);
    expect(tags.value[1]).toBe(tag2);
  });

  it('should return primitive values', () => {
    const tag1 = new VisitorTag('VIP');
    const tag2 = new VisitorTag('Premium');
    const tags = new VisitorTags([tag1, tag2]);

    const primitives = tags.toPrimitives();
    expect(primitives).toEqual(['VIP', 'Premium']);
  });

  it('should create from primitives', () => {
    const primitiveTags = ['High Priority', 'Customer', 'Returning'];
    const tags = VisitorTags.fromPrimitives(primitiveTags);

    expect(tags.value).toHaveLength(3);
    expect(tags.toPrimitives()).toEqual(primitiveTags);
  });

  it('should maintain immutability - defensive copy', () => {
    const tag1 = new VisitorTag('Original tag');
    const originalArray = [tag1];
    const tags = new VisitorTags(originalArray);

    // Modificar el array original no debe afectar el value object
    originalArray.push(new VisitorTag('Added tag'));
    expect(tags.value).toHaveLength(1);
  });

  it('should throw error for non-array input', () => {
    expect(() => new VisitorTags('not an array' as any)).toThrow(
      'VisitorTags debe ser un array de VisitorTag',
    );
    expect(() => new VisitorTags(null as any)).toThrow(
      'VisitorTags debe ser un array de VisitorTag',
    );
    expect(() => new VisitorTags(undefined as any)).toThrow(
      'VisitorTags debe ser un array de VisitorTag',
    );
  });

  it('should throw error for array with invalid tags', () => {
    const invalidArray = [
      new VisitorTag('Valid'),
      'invalid',
      new VisitorTag('Also valid'),
    ];
    expect(() => new VisitorTags(invalidArray as any)).toThrow(
      'VisitorTags debe ser un array de VisitorTag',
    );
  });

  it('should handle array with only invalid objects', () => {
    const invalidArray = ['string', 123, {}];
    expect(() => new VisitorTags(invalidArray as any)).toThrow(
      'VisitorTags debe ser un array de VisitorTag',
    );
  });

  it('should create from empty primitives array', () => {
    const tags = VisitorTags.fromPrimitives([]);
    expect(tags.value).toEqual([]);
    expect(tags.toPrimitives()).toEqual([]);
  });

  it('should handle single tag', () => {
    const tag = new VisitorTag('Solo');
    const tags = new VisitorTags([tag]);

    expect(tags.value).toHaveLength(1);
    expect(tags.toPrimitives()).toEqual(['Solo']);
  });
});
