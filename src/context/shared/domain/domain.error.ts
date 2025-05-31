export abstract class DomainError extends Error {
  public name: string = this.constructor.name;
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // Para asegurar compatibilidad con instanceof en entornos de transpilación
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public static getName(): string {
    return this.name;
  }

  public equals(error: DomainError): boolean {
    return this.name === error.name && this.message === error.message;
  }

  public getName(): string {
    return this.name;
  }
}
