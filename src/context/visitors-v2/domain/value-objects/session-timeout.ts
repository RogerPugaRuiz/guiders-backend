import { PrimitiveValueObject } from '../../../shared/domain/primitive-value-object';

/**
 * Configuraciones de timeout predefinidas para diferentes tipos de sesión
 * Valores configurables via ENV para facilitar testing:
 * - SESSION_TIMEOUT_SHORT: ANON (default: 120000ms = 2 min)
 * - SESSION_TIMEOUT_MEDIUM: ENGAGED (default: 300000ms = 5 min)
 * - SESSION_TIMEOUT_LONG: LEAD (default: 600000ms = 10 min)
 * - SESSION_TIMEOUT_EXTENDED: CONVERTED (default: 900000ms = 15 min)
 */
export enum SessionTimeoutType {
  SHORT = 120000, // 2 minutos (ms) - antes 5 min
  MEDIUM = 300000, // 5 minutos - antes 15 min
  LONG = 600000, // 10 minutos - antes 30 min
  EXTENDED = 900000, // 15 minutos - antes 60 min
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
   * Configurable via SESSION_TIMEOUT_SHORT (default: 2 min)
   */
  public static short(): SessionTimeout {
    const timeout = parseInt(
      process.env.SESSION_TIMEOUT_SHORT || SessionTimeoutType.SHORT.toString(),
      10,
    );
    return new SessionTimeout(timeout);
  }

  /**
   * Timeout medio para visitantes identificados
   * Configurable via SESSION_TIMEOUT_MEDIUM (default: 5 min)
   */
  public static medium(): SessionTimeout {
    const timeout = parseInt(
      process.env.SESSION_TIMEOUT_MEDIUM ||
        SessionTimeoutType.MEDIUM.toString(),
      10,
    );
    return new SessionTimeout(timeout);
  }

  /**
   * Timeout largo para visitantes en conversación
   * Configurable via SESSION_TIMEOUT_LONG (default: 10 min)
   */
  public static long(): SessionTimeout {
    const timeout = parseInt(
      process.env.SESSION_TIMEOUT_LONG || SessionTimeoutType.LONG.toString(),
      10,
    );
    return new SessionTimeout(timeout);
  }

  /**
   * Timeout extendido para visitantes leads/convertidos
   * Configurable via SESSION_TIMEOUT_EXTENDED (default: 15 min)
   */
  public static extended(): SessionTimeout {
    const timeout = parseInt(
      process.env.SESSION_TIMEOUT_EXTENDED ||
        SessionTimeoutType.EXTENDED.toString(),
      10,
    );
    return new SessionTimeout(timeout);
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
