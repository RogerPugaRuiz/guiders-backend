export class VisitorAccountNotFoundError extends Error {
  constructor() {
    super('Account not found');
    this.name = 'VisitorAccountNotFoundError';
  }
}

export class ClientNotFoundError extends Error {
  constructor() {
    super('Client not found');
    this.name = 'ClientNotFoundError';
  }
}

export class VisitorAccountAlreadyExistError extends Error {
  constructor() {
    super('Visitor account already exists');
    this.name = 'VisitorAccountAlreadyExistError';
  }
}

export class InvalidDomainError extends Error {
  constructor() {
    super('Invalid domain');
    this.name = 'InvalidDomainError';
  }
}
