import { VisitorAccountApiKey } from '../../domain/models/visitor-account-api-key';

export const VALIDATE_DOMAIN_API_KEY = 'VALIDATE_DOMAIN_API_KEY';
export interface ValidateDomainApiKey {
  validate(params: {
    apiKey: VisitorAccountApiKey;
    domain: string;
  }): Promise<boolean>;
}
