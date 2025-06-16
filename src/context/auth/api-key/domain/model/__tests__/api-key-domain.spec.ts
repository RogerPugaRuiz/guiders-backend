// Prueba unitaria para ApiKeyDomain
// Ubicación: src/context/auth/api-key/domain/model/__tests__/api-key-domain.spec.ts
import { ApiKeyDomain } from '../api-key-domain';

describe('ApiKeyDomain', () => {
  it('debe crear un dominio válido sin www', () => {
    const domain = new ApiKeyDomain('example.com');
    expect(domain.value).toBe('example.com');
  });

  it('debe crear un dominio válido con www', () => {
    const domain = new ApiKeyDomain('www.example.com');
    expect(domain.value).toBe('www.example.com');
  });

  it('debe permitir dominios con guiones y números', () => {
    const domain = new ApiKeyDomain('test-domain123.com');
    expect(domain.value).toBe('test-domain123.com');
  });

  it('debe permitir dominios con guión bajo', () => {
    const domain = new ApiKeyDomain('test_domain.com');
    expect(domain.value).toBe('test_domain.com');
  });

  it('debe permitir dominios complejos como rmotion.es', () => {
    const domain = new ApiKeyDomain('rmotion.es');
    expect(domain.value).toBe('rmotion.es');
  });

  it('debe permitir dominios complejos con www como www.rmotion.es', () => {
    const domain = new ApiKeyDomain('www.rmotion.es');
    expect(domain.value).toBe('www.rmotion.es');
  });

  it('debe lanzar error para dominio inválido con espacios', () => {
    expect(() => {
      new ApiKeyDomain('invalid domain.com');
    }).toThrow('Invalid API key domain format');
  });

  it('debe lanzar error para dominio inválido con caracteres especiales', () => {
    expect(() => {
      new ApiKeyDomain('invalid@domain.com');
    }).toThrow('Invalid API key domain format');
  });

  it('debe comparar correctamente dos dominios iguales', () => {
    const domain1 = new ApiKeyDomain('example.com');
    const domain2 = new ApiKeyDomain('example.com');

    expect(domain1.equals(domain2)).toBe(true);
  });

  it('debe comparar correctamente dos dominios diferentes', () => {
    const domain1 = new ApiKeyDomain('example.com');
    const domain2 = new ApiKeyDomain('other.com');

    expect(domain1.equals(domain2)).toBe(false);
  });
});
