// Prueba unitaria para UnauthorizedError
// Ubicación: src/context/auth/auth-user/application/errors/__tests__/unauthorized.error.spec.ts
import { UnauthorizedError } from '../unauthorized.error';

describe('UnauthorizedError', () => {
  it('debe crear error con mensaje personalizado', () => {
    const message = 'Access denied';
    const error = new UnauthorizedError(message);

    expect(error.message).toBe(message);
    expect(error.name).toBe('UnauthorizedError');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(UnauthorizedError);
  });

  it('debe heredar de Error', () => {
    const error = new UnauthorizedError('Test message');

    expect(error).toBeInstanceOf(Error);
    expect(error.stack).toBeDefined();
  });

  it('debe mantener el nombre correcto del error', () => {
    const error = new UnauthorizedError('Test unauthorized');

    expect(error.name).toBe('UnauthorizedError');
  });
});
