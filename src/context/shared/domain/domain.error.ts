export abstract class DomainError {
  readonly message: string;
  protected name: string = this.constructor.name;
  constructor(message: string) {
    this.message = message;
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
