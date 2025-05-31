// Prueba unitaria para Content
// Ubicación: src/context/conversations/message/domain/value-objects/__tests__/content.spec.ts
import { Content } from '../content';

describe('Content', () => {
  it('debe crear contenido válido', () => {
    const content = new Content('Hola, ¿cómo puedo ayudarte?');
    expect(content.value).toBe('Hola, ¿cómo puedo ayudarte?');
  });

  it('debe crear contenido con un solo carácter', () => {
    const content = new Content('A');
    expect(content.value).toBe('A');
  });

  it('debe crear contenido con caracteres especiales', () => {
    const content = new Content('¡Hola! ¿Cómo estás? 😊');
    expect(content.value).toBe('¡Hola! ¿Cómo estás? 😊');
  });

  it('debe crear contenido con números', () => {
    const content = new Content('El precio es $100');
    expect(content.value).toBe('El precio es $100');
  });

  it('debe crear contenido con saltos de línea', () => {
    const content = new Content('Primera línea\nSegunda línea');
    expect(content.value).toBe('Primera línea\nSegunda línea');
  });

  it('debe crear contenido con espacios válidos', () => {
    const content = new Content('Contenido con espacios múltiples');
    expect(content.value).toBe('Contenido con espacios múltiples');
  });

  it('debe lanzar error para contenido vacío', () => {
    expect(() => {
      new Content('');
    }).toThrow('El contenido no puede estar vacío');
  });

  it('debe lanzar error para contenido con solo espacios', () => {
    expect(() => {
      new Content('   ');
    }).toThrow('El contenido no puede estar vacío');
  });

  it('debe lanzar error para contenido con solo tabs', () => {
    expect(() => {
      new Content('\t\t\t');
    }).toThrow('El contenido no puede estar vacío');
  });

  it('debe lanzar error para contenido con solo saltos de línea', () => {
    expect(() => {
      new Content('\n\n\n');
    }).toThrow('El contenido no puede estar vacío');
  });

  it('debe lanzar error para contenido con mezcla de espacios en blanco', () => {
    expect(() => {
      new Content('  \t\n  ');
    }).toThrow('El contenido no puede estar vacío');
  });

  it('debe lanzar error para valor null', () => {
    expect(() => {
      new Content(null as any);
    }).toThrow();
  });

  it('debe lanzar error para valor undefined', () => {
    expect(() => {
      new Content(undefined as any);
    }).toThrow();
  });

  it('debe comparar correctamente dos contenidos iguales', () => {
    const content1 = new Content('Hola mundo');
    const content2 = new Content('Hola mundo');

    expect(content1.equals(content2)).toBe(true);
  });

  it('debe comparar correctamente dos contenidos diferentes', () => {
    const content1 = new Content('Hola mundo');
    const content2 = new Content('Adiós mundo');

    expect(content1.equals(content2)).toBe(false);
  });

  it('debe ser case sensitive en la comparación', () => {
    const content1 = new Content('Hola Mundo');
    const content2 = new Content('hola mundo');

    expect(content1.equals(content2)).toBe(false);
  });

  it('debe heredar métodos de PrimitiveValueObject', () => {
    const content = new Content('Contenido de prueba');
    
    expect(typeof content.equals).toBe('function');
    expect(typeof content.getValue).toBe('function');
    expect(content.getValue()).toBe('Contenido de prueba');
  });

  it('debe permitir contenido muy largo', () => {
    const longContent = 'a'.repeat(10000);
    const content = new Content(longContent);
    
    expect(content.value).toBe(longContent);
    expect(content.value.length).toBe(10000);
  });

  it('debe permitir contenido con diferentes tipos de caracteres Unicode', () => {
    const unicodeContent = '🚀 Hello 世界 مرحبا 🌍';
    const content = new Content(unicodeContent);
    
    expect(content.value).toBe(unicodeContent);
  });
});