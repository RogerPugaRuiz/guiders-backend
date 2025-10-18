import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

/**
 * Value Object para el estado de conexión del comercial
 * Define los posibles estados: online, offline, busy, away
 */
const validStatuses = ['online', 'offline', 'busy', 'away'] as const;
type CommercialConnectionStatusType = (typeof validStatuses)[number];

const isValidStatus = (value: string): boolean => {
  return validStatuses.includes(value as CommercialConnectionStatusType);
};

export class CommercialConnectionStatus extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(
      value,
      isValidStatus,
      'El estado de conexión debe ser: online, offline, busy o away',
    );
  }

  public static online(): CommercialConnectionStatus {
    return new CommercialConnectionStatus('online');
  }

  public static offline(): CommercialConnectionStatus {
    return new CommercialConnectionStatus('offline');
  }

  public static busy(): CommercialConnectionStatus {
    return new CommercialConnectionStatus('busy');
  }

  public static away(): CommercialConnectionStatus {
    return new CommercialConnectionStatus('away');
  }

  public isOnline(): boolean {
    return this.value === 'online';
  }

  public isOffline(): boolean {
    return this.value === 'offline';
  }

  public isBusy(): boolean {
    return this.value === 'busy';
  }

  public isAway(): boolean {
    return this.value === 'away';
  }

  public isAvailable(): boolean {
    return this.value === 'online';
  }
}
