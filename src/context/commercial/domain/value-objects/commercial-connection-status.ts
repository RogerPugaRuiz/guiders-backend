import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

/**
 * Value Object para el estado de conexión del comercial
 * Define los posibles estados: online, offline, busy
 */
const validStatuses = ['online', 'offline', 'busy'] as const;
type CommercialConnectionStatusType = (typeof validStatuses)[number];

const isValidStatus = (value: string): boolean => {
  return validStatuses.includes(value as CommercialConnectionStatusType);
};

export class CommercialConnectionStatus extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(
      value,
      isValidStatus,
      'El estado de conexión debe ser: online, offline o busy',
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

  public isOnline(): boolean {
    return this.value === 'online';
  }

  public isOffline(): boolean {
    return this.value === 'offline';
  }

  public isBusy(): boolean {
    return this.value === 'busy';
  }
}
