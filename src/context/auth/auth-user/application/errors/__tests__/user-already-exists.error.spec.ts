// Prueba unitaria para UserAlreadyExistsError
// Ubicación: src/context/auth/auth-user/application/errors/__tests__/user-already-exists.error.spec.ts
import { UserAlreadyExistsError } from '../user-already-exists.error';

describe('UserAlreadyExistsError', () => {
  it('debe crear error con mensaje predefinido', () => {
    const error = new UserAlreadyExistsError();

    expect(error.message).toBe('User already exists');
    expect(error.name).toBe('UserAlreadyExistsError');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(UserAlreadyExistsError);
  });

  it('debe heredar de Error', () => {
    const error = new UserAlreadyExistsError();

    expect(error).toBeInstanceOf(Error);
    expect(error.stack).toBeDefined();
  });

  it('debe mantener el nombre correcto del error', () => {
    const error = new UserAlreadyExistsError();

    expect(error.name).toBe('UserAlreadyExistsError');
  });

  it('debe usar mensaje constante', () => {
    const error1 = new UserAlreadyExistsError();
    const error2 = new UserAlreadyExistsError();

    expect(error1.message).toBe(error2.message);
    expect(error1.message).toBe('User already exists');
  });
});
