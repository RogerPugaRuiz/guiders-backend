export interface HealthResponseDto {
  version: string;
  nodeVersion: string;
  timestamp: string;
  uptime: number;
  status: 'healthy' | 'degraded' | 'unhealthy';
  databases: {
    type: 'postgres' | 'mongodb';
    status: 'connected' | 'degraded' | 'disconnected';
    latencyMs: number | null;
  }[];
}
