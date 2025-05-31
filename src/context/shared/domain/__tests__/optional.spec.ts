// Prueba unitaria para Optional
// Ubicación: src/context/shared/domain/__tests__/optional.spec.ts
import { Optional } from '../optional';

describe('Optional', () => {
  describe('of', () => {
    it('debe crear Optional con valor válido', () => {
      const value = 'test value';
      const optional = Optional.of(value);
      
      expect(optional.isPresent()).toBe(true);
      expect(optional.get()).toBe(value);
    });

    it('debe lanzar error para valor null', () => {
      expect(() => {
        Optional.of(null);
      }).toThrow('El valor no puede ser nulo ni undefined');
    });

    it('debe lanzar error para valor undefined', () => {
      expect(() => {
        Optional.of(undefined);
      }).toThrow('El valor no puede ser nulo ni undefined');
    });
  });

  describe('ofNullable', () => {
    it('debe crear Optional con valor válido', () => {
      const value = 'test value';
      const optional = Optional.ofNullable(value);
      
      expect(optional.isPresent()).toBe(true);
      expect(optional.get()).toBe(value);
    });

    it('debe crear Optional vacío para valor null', () => {
      const optional = Optional.ofNullable(null);
      
      expect(optional.isEmpty()).toBe(true);
      expect(optional.isPresent()).toBe(false);
    });

    it('debe crear Optional vacío para valor undefined', () => {
      const optional = Optional.ofNullable(undefined);
      
      expect(optional.isEmpty()).toBe(true);
      expect(optional.isPresent()).toBe(false);
    });
  });

  describe('empty', () => {
    it('debe crear Optional vacío', () => {
      const optional = Optional.empty<string>();
      
      expect(optional.isEmpty()).toBe(true);
      expect(optional.isPresent()).toBe(false);
    });
  });

  describe('get', () => {
    it('debe retornar valor cuando está presente', () => {
      const value = 'test value';
      const optional = Optional.of(value);
      
      expect(optional.get()).toBe(value);
    });

    it('debe lanzar error cuando está vacío', () => {
      const optional = Optional.empty<string>();
      
      expect(() => {
        optional.get();
      }).toThrow('No hay valor presente');
    });
  });

  describe('orElse', () => {
    it('debe retornar valor cuando está presente', () => {
      const value = 'test value';
      const defaultValue = 'default';
      const optional = Optional.of(value);
      
      expect(optional.orElse(defaultValue)).toBe(value);
    });

    it('debe retornar valor por defecto cuando está vacío', () => {
      const defaultValue = 'default';
      const optional = Optional.empty<string>();
      
      expect(optional.orElse(defaultValue)).toBe(defaultValue);
    });
  });

  describe('map', () => {
    it('debe transformar valor cuando está presente', () => {
      const value = 5;
      const optional = Optional.of(value);
      
      const result = optional.map(x => x * 2);
      
      expect(result.isPresent()).toBe(true);
      expect(result.get()).toBe(10);
    });

    it('debe retornar Optional vacío cuando está vacío', () => {
      const optional = Optional.empty<number>();
      
      const result = optional.map(x => x * 2);
      
      expect(result.isEmpty()).toBe(true);
    });
  });

  describe('filter', () => {
    it('debe retornar Optional con valor cuando cumple predicado', () => {
      const value = 10;
      const optional = Optional.of(value);
      
      const result = optional.filter(x => x > 5);
      
      expect(result.isPresent()).toBe(true);
      expect(result.get()).toBe(value);
    });

    it('debe retornar Optional vacío cuando no cumple predicado', () => {
      const value = 3;
      const optional = Optional.of(value);
      
      const result = optional.filter(x => x > 5);
      
      expect(result.isEmpty()).toBe(true);
    });

    it('debe retornar Optional vacío cuando original está vacío', () => {
      const optional = Optional.empty<number>();
      
      const result = optional.filter(x => x > 5);
      
      expect(result.isEmpty()).toBe(true);
    });
  });

  describe('ifPresent', () => {
    it('debe ejecutar acción cuando valor está presente', () => {
      const value = 'test';
      const optional = Optional.of(value);
      const mockFn = jest.fn();
      
      optional.ifPresent(mockFn);
      
      expect(mockFn).toHaveBeenCalledWith(value);
    });

    it('no debe ejecutar acción cuando está vacío', () => {
      const optional = Optional.empty<string>();
      const mockFn = jest.fn();
      
      optional.ifPresent(mockFn);
      
      expect(mockFn).not.toHaveBeenCalled();
    });
  });

  describe('flatMap', () => {
    it('debe aplicar función que retorna Optional cuando está presente', () => {
      const value = 'test';
      const optional = Optional.of(value);
      
      const result = optional.flatMap(x => Optional.of(x.toUpperCase()));
      
      expect(result.isPresent()).toBe(true);
      expect(result.get()).toBe('TEST');
    });

    it('debe retornar Optional vacío cuando original está vacío', () => {
      const optional = Optional.empty<string>();
      
      const result = optional.flatMap(x => Optional.of(x.toUpperCase()));
      
      expect(result.isEmpty()).toBe(true);
    });

    it('debe retornar Optional vacío cuando función retorna vacío', () => {
      const value = 'test';
      const optional = Optional.of(value);
      
      const result = optional.flatMap(() => Optional.empty<string>());
      
      expect(result.isEmpty()).toBe(true);
    });
  });
});