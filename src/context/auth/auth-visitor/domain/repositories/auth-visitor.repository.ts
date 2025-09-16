import { VisitorAccount } from '../models/visitor-account.aggregate';
export const AUTH_VISITOR_REPOSITORY = 'AuthVisitorRepository';
export interface AuthVisitorRepository {
  save(visitor: VisitorAccount): Promise<void>;
  findByApiKey(apiKey: string): Promise<VisitorAccount[]>;
  findByClientID(clientID: number): Promise<VisitorAccount | null>;
}
