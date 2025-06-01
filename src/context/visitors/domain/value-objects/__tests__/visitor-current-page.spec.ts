// Prueba unitaria para VisitorCurrentPage
// Ubicación: src/context/visitors/domain/value-objects/__tests__/visitor-current-page.spec.ts
import { VisitorCurrentPage } from '../visitor-current-page';

describe('VisitorCurrentPage', () => {
  it('debe crear página actual válida', () => {
    const currentPage = new VisitorCurrentPage('/home');
    expect(currentPage.value).toBe('/home');
  });

  it('debe crear página actual con ruta relativa', () => {
    const currentPage = new VisitorCurrentPage('about');
    expect(currentPage.value).toBe('about');
  });

  it('debe crear página actual con ruta absoluta', () => {
    const currentPage = new VisitorCurrentPage('/products/category/123');
    expect(currentPage.value).toBe('/products/category/123');
  });

  it('debe crear página actual con parámetros de query', () => {
    const currentPage = new VisitorCurrentPage('/search?q=test&category=books');
    expect(currentPage.value).toBe('/search?q=test&category=books');
  });

  it('debe crear página actual con fragmento', () => {
    const currentPage = new VisitorCurrentPage('/docs#section1');
    expect(currentPage.value).toBe('/docs#section1');
  });

  it('debe crear página actual con URL completa', () => {
    const currentPage = new VisitorCurrentPage('https://example.com/page');
    expect(currentPage.value).toBe('https://example.com/page');
  });

  it('debe crear página actual con caracteres especiales', () => {
    const currentPage = new VisitorCurrentPage('/página-con-ñ');
    expect(currentPage.value).toBe('/página-con-ñ');
  });

  it('debe crear página actual con números', () => {
    const currentPage = new VisitorCurrentPage('/product/123456');
    expect(currentPage.value).toBe('/product/123456');
  });

  it('debe lanzar error para página vacía', () => {
    expect(() => {
      new VisitorCurrentPage('');
    }).toThrow('La página actual no puede estar vacía');
  });

  it('debe lanzar error para página con solo espacios', () => {
    expect(() => {
      new VisitorCurrentPage('   ');
    }).toThrow('La página actual no puede estar vacía');
  });

  it('debe lanzar error para página con solo tabs', () => {
    expect(() => {
      new VisitorCurrentPage('\t\t\t');
    }).toThrow('La página actual no puede estar vacía');
  });

  it('debe lanzar error para página con solo saltos de línea', () => {
    expect(() => {
      new VisitorCurrentPage('\n\n\n');
    }).toThrow('La página actual no puede estar vacía');
  });

  it('debe lanzar error para página con espacios en blanco mixtos', () => {
    expect(() => {
      new VisitorCurrentPage('  \t\n  ');
    }).toThrow('La página actual no puede estar vacía');
  });

  it('debe lanzar error para valor null', () => {
    expect(() => {
      new VisitorCurrentPage(null as any);
    }).toThrow();
  });

  it('debe lanzar error para valor undefined', () => {
    expect(() => {
      new VisitorCurrentPage(undefined as any);
    }).toThrow();
  });

  it('debe lanzar error para valor no string', () => {
    expect(() => {
      new VisitorCurrentPage(123 as any);
    }).toThrow();

    expect(() => {
      new VisitorCurrentPage({} as any);
    }).toThrow();

    expect(() => {
      new VisitorCurrentPage([] as any);
    }).toThrow();
  });

  it('debe exponer valor a través de getValue()', () => {
    const currentPage = new VisitorCurrentPage('/dashboard');
    expect(currentPage.getValue()).toBe('/dashboard');
  });

  it('debe comparar correctamente dos páginas iguales', () => {
    const page1 = new VisitorCurrentPage('/home');
    const page2 = new VisitorCurrentPage('/home');

    expect(page1.equals(page2)).toBe(true);
  });

  it('debe comparar correctamente dos páginas diferentes', () => {
    const page1 = new VisitorCurrentPage('/home');
    const page2 = new VisitorCurrentPage('/about');

    expect(page1.equals(page2)).toBe(false);
  });

  it('debe ser case sensitive al comparar', () => {
    const page1 = new VisitorCurrentPage('/Home');
    const page2 = new VisitorCurrentPage('/home');

    expect(page1.equals(page2)).toBe(false);
  });
});