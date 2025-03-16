import { VisitorConnection } from './visitor-connection';

export const VISITOR_CONNECTION_REPOSITORY = 'VisitorConnectionRepository';

export interface VisitorConnectionRepository {
  save(visitorConnection: VisitorConnection): Promise<void>;
  find(id: string): Promise<VisitorConnection | null>;
  delete(id: string): Promise<void>;
  list(): Promise<VisitorConnection[]>;
}
