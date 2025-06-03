import { FakerAliasGeneratorAdapter } from '../faker-alias-generator.adapter';

describe('FakerAliasGeneratorAdapter', () => {
  let service: FakerAliasGeneratorAdapter;

  beforeEach(() => {
    service = new FakerAliasGeneratorAdapter();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate a non-empty alias', () => {
    const alias = service.generate();

    expect(alias).toBeDefined();
    expect(typeof alias).toBe('string');
    expect(alias.length).toBeGreaterThan(0);
  });

  it('should generate alias with two words separated by space', () => {
    const alias = service.generate();

    const words = alias.split(' ');
    expect(words).toHaveLength(2);
    expect(words[0]).toBeTruthy();
    expect(words[1]).toBeTruthy();
  });

  it('should generate alias with capitalized first letters', () => {
    const alias = service.generate();

    const words = alias.split(' ');
    // Verificar que la primera letra de cada palabra esté en mayúscula
    words.forEach((word) => {
      expect(word[0]).toBe(word[0].toUpperCase());
    });
  });

  it('should generate different aliases on multiple calls', () => {
    const aliases = new Set();

    // Generar múltiples alias y verificar que no sean todos iguales
    for (let i = 0; i < 10; i++) {
      aliases.add(service.generate());
    }

    // Es muy improbable que todos los alias sean iguales
    expect(aliases.size).toBeGreaterThan(1);
  });

  it('should only contain alphabetic characters and space', () => {
    const alias = service.generate();

    // Verificar que solo contenga letras y espacios
    expect(alias).toMatch(/^[A-Za-z\s]+$/);
  });
});
