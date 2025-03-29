export abstract class DomainError {
  readonly message: string;
  protected name: string = this.constructor.name;
  constructor(message: string) {
    this.message = message;
  }
}
