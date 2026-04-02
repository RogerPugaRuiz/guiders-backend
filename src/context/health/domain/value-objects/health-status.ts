export type HealthStatusValue = 'healthy' | 'degraded' | 'unhealthy';

export class HealthStatus {
  private constructor(private readonly _value: HealthStatusValue) {}

  static healthy(): HealthStatus {
    return new HealthStatus('healthy');
  }

  static degraded(): HealthStatus {
    return new HealthStatus('degraded');
  }

  static unhealthy(): HealthStatus {
    return new HealthStatus('unhealthy');
  }

  get value(): HealthStatusValue {
    return this._value;
  }

  isHealthy(): boolean {
    return this._value === 'healthy';
  }

  isDegraded(): boolean {
    return this._value === 'degraded';
  }

  isUnhealthy(): boolean {
    return this._value === 'unhealthy';
  }

  equals(other: HealthStatus): boolean {
    return this._value === other._value;
  }
}
