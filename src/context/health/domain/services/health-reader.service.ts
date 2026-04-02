import { DatabaseStatus } from '../value-objects/database-status';

export interface HealthData {
  version: string;
  nodeVersion: string;
  timestamp: string;
  uptime: number;
  databases: DatabaseStatus[];
}

export interface HealthReaderService {
  getHealthData(): Promise<HealthData>;
}
