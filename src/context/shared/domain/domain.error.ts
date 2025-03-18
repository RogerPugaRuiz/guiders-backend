export abstract class DomainError {
  abstract message: string;
  abstract details?: string | Record<string, unknown> | undefined;
}
