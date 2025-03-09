export class Optional<T> {
  constructor(private readonly value: T | null) {}

  static of<T>(value: T): Optional<T> {
    if (value == null) {
      throw new Error('El valor no puede ser nulo');
    }
    return new Optional(value);
  }

  static empty<T>(): Optional<T> {
    return new Optional<T>(null);
  }

  get(): T {
    if (this.value === null) {
      throw new Error('No hay valor presente');
    }
    return this.value;
  }

  getOrElse(defaultValue: T): T {
    return this.value !== null ? this.value : defaultValue;
  }

  isDefined(): boolean {
    return this.value !== null;
  }
}
