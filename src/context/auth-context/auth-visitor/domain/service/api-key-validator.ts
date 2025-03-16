export interface ApiKeyValidator {
  validate(apiKey: string): Promise<boolean>;
}