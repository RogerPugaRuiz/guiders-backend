import { PrimitiveValueObject } from '../../../shared/domain/primitive-value-object';

/**
 * Value Object para la fecha/hora en que ocurrió el evento
 */
export class EventOccurredAt extends PrimitiveValueObject<Date> {
  constructor(value: Date) {
    super(
      value,
      (val) => val instanceof Date && !isNaN(val.getTime()),
      'La fecha de ocurrencia del evento debe ser una fecha válida',
    );
  }

  public static now(): EventOccurredAt {
    return new EventOccurredAt(new Date());
  }

  public static fromTimestamp(timestamp: number): EventOccurredAt {
    return new EventOccurredAt(new Date(timestamp));
  }

  public static fromISOString(isoString: string): EventOccurredAt {
    return new EventOccurredAt(new Date(isoString));
  }

  /**
   * Obtiene el timestamp en milisegundos
   */
  public toTimestamp(): number {
    return this.value.getTime();
  }

  /**
   * Convierte a string ISO
   */
  public toISOString(): string {
    return this.value.toISOString();
  }

  /**
   * Verifica si el evento ocurrió antes que otro
   */
  public isBefore(other: EventOccurredAt): boolean {
    return this.value.getTime() < other.value.getTime();
  }

  /**
   * Verifica si el evento ocurrió después que otro
   */
  public isAfter(other: EventOccurredAt): boolean {
    return this.value.getTime() > other.value.getTime();
  }

  /**
   * Obtiene el mes y año para particionamiento
   * Formato: YYYY_MM
   */
  public getPartitionKey(): string {
    const year = this.value.getFullYear();
    const month = String(this.value.getMonth() + 1).padStart(2, '0');
    return `${year}_${month}`;
  }

  /**
   * Verifica si el evento ocurrió dentro de una ventana temporal (en milisegundos)
   */
  public isWithinWindow(other: EventOccurredAt, windowMs: number): boolean {
    return Math.abs(this.value.getTime() - other.value.getTime()) <= windowMs;
  }
}
