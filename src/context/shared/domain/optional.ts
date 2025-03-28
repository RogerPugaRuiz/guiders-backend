export class Optional<T> {
  private constructor(private readonly value: T | null) {}

  /**
   * Crea un Optional con un valor no nulo.
   * Lanza un error si el valor es nulo o undefined.
   */
  static of<T>(value: T): Optional<T> {
    if (value === null || value === undefined) {
      throw new Error('El valor no puede ser nulo ni undefined');
    }
    return new Optional(value);
  }

  /**
   * Crea un Optional que acepta nulo o undefined.
   * Si el valor es nulo/undefined, se crea un Optional vacío.
   */
  static ofNullable<T>(value: T | null | undefined): Optional<T> {
    if (value === null || value === undefined) {
      return new Optional<T>(null);
    }
    return new Optional<T>(value);
  }

  /**
   * Retorna un Optional vacío (sin valor).
   */
  static empty<T>(): Optional<T> {
    return new Optional<T>(null);
  }

  /**
   * Retorna el valor interno.
   * Puede ser null si no se revisa antes con isPresent() o con un get seguro.
   */
  get(): T {
    if (this.value === null) {
      throw new Error('No hay valor presente');
    }
    return this.value;
  }

  getOrNull(): T | null {
    return this.value;
  }

  equals(other: Optional<T>): boolean {
    if (!this.isPresent() && !other.isPresent()) {
      return true;
    }
    if (!this.isPresent() || !other.isPresent()) {
      return false;
    }
    return this.value === other.value;
  }

  /**
   * Retorna true si hay un valor presente, false si está vacío.
   */
  isPresent(): boolean {
    return this.value !== null;
  }

  /**
   * Retorna true si está vacío, false si hay un valor presente.
   */
  isEmpty(): boolean {
    return !this.isPresent();
  }

  /**
   * Ejecuta la acción (consumer) si hay valor presente.
   */
  ifPresent(consumer: (value: T) => void): void {
    if (this.isPresent()) {
      consumer(this.value as T);
    }
  }

  /**
   * Aplica la función map al valor interno y retorna un nuevo Optional con el resultado.
   * Si está vacío, devuelve un Optional vacío.
   */
  map<U>(mapper: (value: T) => U): Optional<U> {
    if (!this.isPresent()) {
      return Optional.empty<U>();
    }
    const mapped = mapper(this.value as T);
    // si el mapper puede devolver null/undefined, conviene usar ofNullable
    return Optional.ofNullable(mapped);
  }

  /**
   * Versión de map que espera un Optional como retorno del mapper y "aplana" el resultado.
   */
  flatMap<U>(mapper: (value: T) => Optional<U>): Optional<U> {
    if (!this.isPresent()) {
      return Optional.empty<U>();
    }
    return mapper(this.value as T);
  }

  /**
   * Aplica el filtro. Si la condición no se cumple, retorna vacío.
   */
  filter(predicate: (value: T) => boolean): Optional<T> {
    if (!this.isPresent() || !predicate(this.value as T)) {
      return Optional.empty<T>();
    }
    return this;
  }

  /**
   * Retorna el valor si está presente; en caso contrario retorna el defaultValue.
   */
  orElse(defaultValue: T): T {
    return this.isPresent() ? (this.value as T) : defaultValue;
  }

  /**
   * Similar a orElse, pero utiliza un proveedor (supplier) para el valor por defecto.
   */
  orElseGet(supplier: () => T): T {
    return this.isPresent() ? (this.value as T) : supplier();
  }

  /**
   * Retorna el valor si está presente o lanza un Error si está ausente.
   */
  orElseThrow(error: Error): T {
    if (!this.isPresent()) {
      throw error;
    }
    return this.value as T;
  }

  /**
   * Versión de orElseThrow que usa un proveedor (supplier) para generar un Error dinámicamente.
   */
  orElseThrowSupplier(errorSupplier: () => Error): T {
    if (!this.isPresent()) {
      throw errorSupplier();
    }
    return this.value as T;
  }

  /**
   * Ejecuta fold sobre el valor interno.
   * Si hay un valor presente, aplica mapper y devuelve el resultado.
   * Si está vacío, retorna el resultado de ifEmpty.
   */
  fold<U>(ifEmpty: () => U, mapper: (value: T) => U): U {
    return this.isPresent() ? mapper(this.value as T) : ifEmpty();
  }
}
