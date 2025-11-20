import { PrimitiveValueObject } from '../../../shared/domain/primitive-value-object';

/**
 * Value Object para los metadatos flexibles del evento
 * Permite almacenar cualquier estructura JSON con el evento
 */
export class EventMetadata extends PrimitiveValueObject<Record<string, any>> {
  constructor(value: Record<string, any>) {
    super(
      value,
      (val) => val !== null && val !== undefined && typeof val === 'object',
      'Los metadatos del evento deben ser un objeto válido',
    );
  }

  public static empty(): EventMetadata {
    return new EventMetadata({});
  }

  /**
   * Obtiene un valor específico de los metadatos
   */
  public get(key: string): any {
    return this.value[key];
  }

  /**
   * Verifica si existe una clave en los metadatos
   */
  public has(key: string): boolean {
    return key in this.value;
  }

  /**
   * Obtiene las claves de los metadatos
   */
  public keys(): string[] {
    return Object.keys(this.value);
  }

  /**
   * Compara metadatos ignorando el orden de las claves
   */
  public equals(other: EventMetadata): boolean {
    const thisKeys = this.keys().sort();
    const otherKeys = other.keys().sort();

    if (thisKeys.length !== otherKeys.length) {
      return false;
    }

    for (let i = 0; i < thisKeys.length; i++) {
      if (thisKeys[i] !== otherKeys[i]) {
        return false;
      }

      const thisValue = this.get(thisKeys[i]);
      const otherValue = other.get(thisKeys[i]);

      if (JSON.stringify(thisValue) !== JSON.stringify(otherValue)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Merge con otros metadatos (crea nuevo objeto)
   */
  public merge(other: EventMetadata): EventMetadata {
    return new EventMetadata({
      ...this.value,
      ...other.value,
    });
  }

  /**
   * Tamaño aproximado en bytes del JSON serializado
   * Útil para optimizaciones de batching
   */
  public approximateSize(): number {
    return JSON.stringify(this.value).length;
  }
}
