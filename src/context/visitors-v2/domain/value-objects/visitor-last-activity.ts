import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

/**
 * Value Object para la última actividad del visitante
 * Encapsula un timestamp que indica cuándo fue la última actividad
 */
const isValidTimestamp = (value: Date): boolean => {
  return value instanceof Date && !isNaN(value.getTime());
};

export class VisitorLastActivity extends PrimitiveValueObject<Date> {
  constructor(value: Date) {
    super(
      value,
      isValidTimestamp,
      'La última actividad debe ser una fecha válida',
    );
  }

  public static now(): VisitorLastActivity {
    return new VisitorLastActivity(new Date());
  }

  public isExpired(timeoutMinutes: number): boolean {
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const now = new Date().getTime();
    return now - this.value.getTime() > timeoutMs;
  }

  public minutesAgo(): number {
    const now = new Date().getTime();
    const diffMs = now - this.value.getTime();
    return Math.floor(diffMs / (60 * 1000));
  }
}
