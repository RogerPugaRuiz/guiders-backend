// Prueba unitaria para NavigationPath
// Ubicación: src/context/tracking/domain/value-objects/__tests__/navigation-path.spec.ts
import { NavigationPath, NavigationPathStep } from '../navigation-path';

describe('NavigationPathStep', () => {
  it('debe crear un step válido', () => {
    const step = new NavigationPathStep('home');
    expect(step.value).toBe('home');
  });

  it('debe crear step con caracteres especiales', () => {
    const step = new NavigationPathStep('products/category-1');
    expect(step.value).toBe('products/category-1');
  });

  it('debe lanzar error para step vacío', () => {
    expect(() => {
      new NavigationPathStep('');
    }).toThrow('NavigationPathStep debe ser un string no vacío');
  });

  it('debe lanzar error para step con solo espacios', () => {
    expect(() => {
      new NavigationPathStep('   ');
    }).toThrow('NavigationPathStep debe ser un string no vacío');
  });

  it('debe lanzar error para valor no string', () => {
    expect(() => {
      new NavigationPathStep(null as any);
    }).toThrow('NavigationPathStep debe ser un string no vacío');

    expect(() => {
      new NavigationPathStep(123 as any);
    }).toThrow('NavigationPathStep debe ser un string no vacío');
  });

  it('debe comparar correctamente dos steps iguales', () => {
    const step1 = new NavigationPathStep('home');
    const step2 = new NavigationPathStep('home');

    expect(step1.equals(step2)).toBe(true);
  });
});

describe('NavigationPath', () => {
  it('debe crear un path vacío', () => {
    const path = new NavigationPath([]);
    expect(path.value).toEqual([]);
    expect(path.toPrimitives()).toEqual([]);
  });

  it('debe crear un path con un step', () => {
    const step = new NavigationPathStep('home');
    const path = new NavigationPath([step]);

    expect(path.value).toHaveLength(1);
    expect(path.value[0].value).toBe('home');
    expect(path.toPrimitives()).toEqual(['home']);
  });

  it('debe crear un path con múltiples steps', () => {
    const steps = [
      new NavigationPathStep('home'),
      new NavigationPathStep('products'),
      new NavigationPathStep('category-1'),
      new NavigationPathStep('product-detail'),
    ];
    const path = new NavigationPath(steps);

    expect(path.value).toHaveLength(4);
    expect(path.toPrimitives()).toEqual([
      'home',
      'products',
      'category-1',
      'product-detail',
    ]);
  });

  it('debe crear path desde primitivos', () => {
    const primitives = ['home', 'products', 'category-1'];
    const path = NavigationPath.fromPrimitives(primitives);

    expect(path.value).toHaveLength(3);
    expect(path.toPrimitives()).toEqual(primitives);
  });

  it('debe lanzar error para array con elementos no NavigationPathStep', () => {
    expect(() => {
      new NavigationPath(['invalid'] as any);
    }).toThrow('NavigationPath debe ser un array de NavigationPathStep');
  });

  it('debe lanzar error para valor no array', () => {
    expect(() => {
      new NavigationPath('invalid' as any);
    }).toThrow('NavigationPath debe ser un array de NavigationPathStep');
  });

  it('debe inmutabilizar el array de steps', () => {
    const steps = [new NavigationPathStep('home')];
    const path = new NavigationPath(steps);

    // Modificar el array original no debe afectar al path
    steps.push(new NavigationPathStep('other'));

    expect(path.value).toHaveLength(1);
    expect(path.toPrimitives()).toEqual(['home']);
  });

  it('debe comparar correctamente dos paths iguales', () => {
    const steps1 = [
      new NavigationPathStep('home'),
      new NavigationPathStep('products'),
    ];
    const steps2 = [
      new NavigationPathStep('home'),
      new NavigationPathStep('products'),
    ];

    const path1 = new NavigationPath(steps1);
    const path2 = new NavigationPath(steps2);

    expect(path1.equals(path2)).toBe(true);
  });

  it('debe comparar correctamente dos paths diferentes', () => {
    const path1 = new NavigationPath([new NavigationPathStep('home')]);
    const path2 = new NavigationPath([new NavigationPathStep('products')]);

    expect(path1.equals(path2)).toBe(false);
  });
});
