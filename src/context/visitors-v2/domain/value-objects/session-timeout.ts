import { PrimitiveValueObject } from '../../../shared/domain/primitive-value-object';

/**
 * Configuraciones de timeout predefinidas para diferentes tipos de sesión
 */
export enum SessionTimeoutType {
  SHORT = 300000, // 5 minutos (ms)
  MEDIUM = 900000, // 15 minutos
  LONG = 1800000, // 30 minutos
  EXTENDED = 3600000, // 60 minutos
}

/**
 * Value Object para el timeout de sesión
 * Representa el tiempo máximo de inactividad antes de considerar la sesión expirada
 */
export class SessionTimeout extends PrimitiveValueObject<number> {
  constructor(timeoutMs: number) {
    super(
      timeoutMs,
      (value) => Number.isInteger(value) && value > 0 && value <= 86400000, // máximo 24h
      'El timeout de sesión debe ser un entero positivo menor a 24 horas (86400000ms)',
    );
  }

  /**
   * Timeout corto para visitantes anónimos
   */
  public static short(): SessionTimeout {
    return new SessionTimeout(SessionTimeoutType.SHORT);
  }

  /**
   * Timeout medio para visitantes identificados
   */
  public static medium(): SessionTimeout {
    return new SessionTimeout(SessionTimeoutType.MEDIUM);
  }

  /**
   * Timeout largo para visitantes en conversación
   */
  public static long(): SessionTimeout {
    return new SessionTimeout(SessionTimeoutType.LONG);
  }

  /**
   * Timeout extendido para visitantes leads/convertidos
   */
  public static extended(): SessionTimeout {
    return new SessionTimeout(SessionTimeoutType.EXTENDED);
  }

  /**
   * Verifica si ha transcurrido el tiempo de timeout desde la última actividad
   */
  public isExpired(lastActivityAt: Date): boolean {
    const now = new Date();
    const timeSinceActivity = now.getTime() - lastActivityAt.getTime();
    return timeSinceActivity > this.value;
  }

  /**
   * Obtiene el timeout en segundos
   */
  public toSeconds(): number {
    return Math.floor(this.value / 1000);
  }

  /**
   * Obtiene el timeout en minutos
   */
  public toMinutes(): number {
    return Math.floor(this.value / 60000);
  }
}
