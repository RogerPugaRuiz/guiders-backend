import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

/**
 * Prioridades posibles para un chat V2
 */
export enum ChatPriorityEnum {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

/**
 * Value object para la prioridad del chat V2
 * Determina el orden de atención en la cola de chats
 */
export class ChatPriority extends PrimitiveValueObject<string> {
  // Prioridades estáticas para facilitar comparaciones
  static readonly LOW = new ChatPriority(ChatPriorityEnum.LOW);
  static readonly MEDIUM = new ChatPriority(ChatPriorityEnum.MEDIUM);
  static readonly NORMAL = new ChatPriority(ChatPriorityEnum.NORMAL);
  static readonly HIGH = new ChatPriority(ChatPriorityEnum.HIGH);
  static readonly URGENT = new ChatPriority(ChatPriorityEnum.URGENT);

  constructor(value: string) {
    super(
      value,
      (val: string) =>
        Object.values(ChatPriorityEnum).includes(val as ChatPriorityEnum),
      'La prioridad del chat debe ser uno de los valores válidos',
    );
  }

  /**
   * Obtiene el valor numérico de la prioridad para ordenamiento
   * Mayor número = mayor prioridad
   */
  getNumericValue(): number {
    switch (this.value) {
      case ChatPriorityEnum.LOW.toString():
        return 1;
      case ChatPriorityEnum.MEDIUM.toString():
        return 2;
      case ChatPriorityEnum.NORMAL.toString():
        return 2; // NORMAL y MEDIUM tienen el mismo peso
      case ChatPriorityEnum.HIGH.toString():
        return 3;
      case ChatPriorityEnum.URGENT.toString():
        return 4;
      default:
        return 2; // NORMAL por defecto
    }
  }

  /**
   * Verifica si es prioridad urgente
   */
  isUrgent(): boolean {
    return this.value === ChatPriorityEnum.URGENT.toString();
  }

  /**
   * Verifica si es prioridad alta o urgente
   */
  isHighPriority(): boolean {
    return (
      this.value === ChatPriorityEnum.HIGH.toString() ||
      this.value === ChatPriorityEnum.URGENT.toString()
    );
  }

  /**
   * Compara con otra prioridad para ordenamiento
   * Retorna: -1 si esta es menor, 0 si igual, 1 si mayor
   */
  compareTo(other: ChatPriority): number {
    const thisValue = this.getNumericValue();
    const otherValue = other.getNumericValue();

    if (thisValue < otherValue) return -1;
    if (thisValue > otherValue) return 1;
    return 0;
  }

  /**
   * Verifica si esta prioridad es mayor que otra
   */
  isHigherThan(other: ChatPriority): boolean {
    return this.getNumericValue() > other.getNumericValue();
  }
}
