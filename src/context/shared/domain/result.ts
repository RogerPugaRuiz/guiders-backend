// Implementación del patrón Result en TypeScript

import { DomainError } from './domain.error';

// Tipo unión que puede ser Ok o Err.
export type Result<T, E extends DomainError> = Ok<T, E> | Err<T, E>;

export class Ok<T, E extends DomainError> {
  public readonly value: T;

  constructor(value: T) {
    this.value = value;
    Object.freeze(this); // Garantizamos inmutabilidad
  }

  isOk(): this is Ok<T, E> {
    return true;
  }

  isErr(): this is Err<T, E> {
    return false;
  }

  // Transforma el valor en caso de éxito.
  map<U>(fn: (value: T) => U): Result<U, E> {
    return new Ok<U, E>(fn(this.value));
  }

  // En Ok, mapError no hace nada y cambia el tipo del error.
  mapError<F extends DomainError>(_fn: (error: E) => F): Result<T, F> {
    return new Ok<T, F>(this.value);
  }

  // Devuelve el valor o, en el caso de error, lanza una excepción (nunca sucede en Ok).
  unwrap(): T {
    return this.value;
  }

  // Devuelve el valor o un valor por defecto (en Ok, siempre devuelve el valor).
  unwrapOr(_default: T): T {
    return this.value;
  }

  // Ejecuta onOk si es Ok, onErr en caso contrario.
  fold<U>(onErr: (error: E) => U, onOk: (value: T) => U): U {
    return onOk(this.value);
  }
}

export class Err<T, E extends DomainError> {
  public readonly error: E;

  constructor(error: E) {
    this.error = error;
    Object.freeze(this); // Garantizamos inmutabilidad
  }

  isOk(): this is Ok<T, E> {
    return false;
  }

  isErr(): this is Err<T, E> {
    return true;
  }

  // En caso de error, map no transforma el valor.
  map<U>(_fn: (value: T) => U): Result<U, E> {
    return new Err<U, E>(this.error);
  }

  // Transforma el error.
  mapError<F extends DomainError>(fn: (error: E) => F): Result<T, F> {
    return new Err<T, F>(fn(this.error));
  }

  // Intentar desempaquetar un Err lanza error.
  unwrap(): T {
    throw new Error('No se puede desempaquetar un Err');
  }

  // Devuelve un valor por defecto en caso de error.
  unwrapOr(defaultValue: T): T {
    return defaultValue;
  }

  // Ejecuta onErr si es Err, onOk en caso contrario.
  fold<U>(onErr: (error: E) => U, onOk: (value: T) => U): U {
    return onErr(this.error);
  }
}

// Funciones de fábrica para crear instancias de Ok y Err.
export function ok<T, E extends DomainError>(value: T): Result<T, E> {
  return new Ok<T, E>(value);
}

export function err<T, E extends DomainError>(error: E): Result<T, E> {
  return new Err<T, E>(error);
}
