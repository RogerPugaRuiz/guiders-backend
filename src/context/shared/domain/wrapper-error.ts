import { DomainError } from 'src/context/shared/domain/domain.error';

export class DomainErrorWrapper extends DomainError {
  public readonly errors: DomainError[];

  constructor(errors: DomainError[]) {
    // Concatenamos los mensajes de cada error, separándolos para identificar cada uno.
    super(errors.map((error) => error.message).join(' | '));
    this.errors = errors;
  }

  has(error: string): boolean {
    return this.errors.some((e) => e.getName() === error);
  }

  hasAny(): boolean {
    return this.errors.length > 0;
  }
}

export class DomainErrorWrapperBuilder {
  private errors: DomainError[] = [];

  constructor(initialErrors?: DomainError[]) {
    if (initialErrors) {
      this.errors = [...initialErrors];
    }
  }

  // Crea un builder vacío
  static create(): DomainErrorWrapperBuilder {
    return new DomainErrorWrapperBuilder();
  }

  // Inicia el builder a partir de un DomainErrorWrapper existente
  static fromExisting(wrapper: DomainErrorWrapper): DomainErrorWrapperBuilder {
    return new DomainErrorWrapperBuilder(wrapper.errors);
  }

  // Agrega un error individual
  add(error: DomainError): DomainErrorWrapperBuilder {
    this.errors.push(error);
    return this;
  }

  // Agrega varios errores a la vez
  addMany(errors: DomainError[]): DomainErrorWrapperBuilder {
    this.errors.push(...errors);
    return this;
  }

  // Remueve un error (basado en la igualdad referencial)
  remove(error: DomainError): DomainErrorWrapperBuilder {
    this.errors = this.errors.filter((e) => e !== error);
    return this;
  }

  // Limpia todos los errores del builder
  clear(): DomainErrorWrapperBuilder {
    this.errors = [];
    return this;
  }

  // Construye el DomainErrorWrapper con los errores acumulados
  build(): DomainErrorWrapper {
    return new DomainErrorWrapper(this.errors);
  }
}
