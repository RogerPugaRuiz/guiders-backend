/**
 * Ciclo de vida de un visitante en el sistema
 */
export enum VisitorLifecycle {
  ANON = 'anon', // Visitante anónimo
  ENGAGED = 'engaged', // Visitante que ha mostrado engagement
  LEAD = 'lead', // Visitante convertido en lead
  CONVERTED = 'converted', // Visitante convertido en cliente
}

/**
 * Utilidades para trabajar con VisitorLifecycle
 */
export class VisitorLifecycleUtils {
  /**
   * Crea un VisitorLifecycle desde su valor string
   */
  public static fromValue(value: string): VisitorLifecycle {
    const lifecycles = Object.values(VisitorLifecycle) as string[];
    const lifecycle = lifecycles.find((l) => l === value);
    if (!lifecycle) {
      throw new Error(`Ciclo de vida de visitante inválido: ${value}`);
    }
    return lifecycle as VisitorLifecycle;
  }

  /**
   * Obtiene todos los valores válidos
   */
  public static getValidValues(): string[] {
    return Object.values(VisitorLifecycle) as string[];
  }
}

/**
 * Value Object para el ciclo de vida del visitante
 */
export class VisitorLifecycleVO {
  constructor(private readonly _value: VisitorLifecycle) {
    this.ensureIsValidLifecycle(_value);
  }

  public static anon(): VisitorLifecycleVO {
    return new VisitorLifecycleVO(VisitorLifecycle.ANON);
  }

  public static engaged(): VisitorLifecycleVO {
    return new VisitorLifecycleVO(VisitorLifecycle.ENGAGED);
  }

  public static lead(): VisitorLifecycleVO {
    return new VisitorLifecycleVO(VisitorLifecycle.LEAD);
  }

  public static converted(): VisitorLifecycleVO {
    return new VisitorLifecycleVO(VisitorLifecycle.CONVERTED);
  }

  public getValue(): VisitorLifecycle {
    return this._value;
  }

  public isAnon(): boolean {
    return this._value === VisitorLifecycle.ANON;
  }

  public isEngaged(): boolean {
    return this._value === VisitorLifecycle.ENGAGED;
  }

  public isLead(): boolean {
    return this._value === VisitorLifecycle.LEAD;
  }

  public isConverted(): boolean {
    return this._value === VisitorLifecycle.CONVERTED;
  }

  /**
   * Verifica si puede transicionar al nuevo estado del ciclo de vida
   */
  public canTransitionTo(newLifecycle: VisitorLifecycle): boolean {
    const validTransitions: Record<VisitorLifecycle, VisitorLifecycle[]> = {
      [VisitorLifecycle.ANON]: [
        VisitorLifecycle.ENGAGED,
        VisitorLifecycle.LEAD,
      ],
      [VisitorLifecycle.ENGAGED]: [
        VisitorLifecycle.LEAD,
        VisitorLifecycle.CONVERTED,
      ],
      [VisitorLifecycle.LEAD]: [VisitorLifecycle.CONVERTED],
      [VisitorLifecycle.CONVERTED]: [], // Estado final
    };

    return validTransitions[this._value].includes(newLifecycle);
  }

  public equals(other: VisitorLifecycleVO): boolean {
    return this._value === other._value;
  }

  private ensureIsValidLifecycle(lifecycle: VisitorLifecycle): void {
    if (!Object.values(VisitorLifecycle).includes(lifecycle)) {
      throw new Error(`Ciclo de vida de visitante inválido: ${lifecycle}`);
    }
  }
}
