/**
 * Estados posibles de un visitante en el sistema
 */
export enum VisitorState {
  ANONYMOUS = 'anonymous',
  IDENTIFIED = 'identified',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  IN_CHAT = 'in_chat',
  CONVERTED = 'converted',
  INACTIVE = 'inactive',
}

/**
 * Utilidades para trabajar con VisitorState
 */
export class VisitorStateUtils {
  /**
   * Crea un VisitorState desde su valor string
   */
  public static fromValue(value: string): VisitorState {
    const states = Object.values(VisitorState) as string[];
    const state = states.find((s) => s === value);
    if (!state) {
      throw new Error(`Estado de visitante inválido: ${value}`);
    }
    return state as VisitorState;
  }

  /**
   * Obtiene todos los valores válidos
   */
  public static getValidValues(): string[] {
    return Object.values(VisitorState) as string[];
  }
}

/**
 * Value Object para el estado del visitante
 */
export class VisitorStateVO {
  constructor(private readonly _value: VisitorState) {
    this.ensureIsValidState(_value);
  }

  public static anonymous(): VisitorStateVO {
    return new VisitorStateVO(VisitorState.ANONYMOUS);
  }

  public static identified(): VisitorStateVO {
    return new VisitorStateVO(VisitorState.IDENTIFIED);
  }

  public static connected(): VisitorStateVO {
    return new VisitorStateVO(VisitorState.CONNECTED);
  }

  public static disconnected(): VisitorStateVO {
    return new VisitorStateVO(VisitorState.DISCONNECTED);
  }

  public static inChat(): VisitorStateVO {
    return new VisitorStateVO(VisitorState.IN_CHAT);
  }

  public static converted(): VisitorStateVO {
    return new VisitorStateVO(VisitorState.CONVERTED);
  }

  public static inactive(): VisitorStateVO {
    return new VisitorStateVO(VisitorState.INACTIVE);
  }

  public getValue(): VisitorState {
    return this._value;
  }

  public isAnonymous(): boolean {
    return this._value === VisitorState.ANONYMOUS;
  }

  public isIdentified(): boolean {
    return this._value === VisitorState.IDENTIFIED;
  }

  public isConnected(): boolean {
    return this._value === VisitorState.CONNECTED;
  }

  public isDisconnected(): boolean {
    return this._value === VisitorState.DISCONNECTED;
  }

  public isInChat(): boolean {
    return this._value === VisitorState.IN_CHAT;
  }

  public isConverted(): boolean {
    return this._value === VisitorState.CONVERTED;
  }

  public isInactive(): boolean {
    return this._value === VisitorState.INACTIVE;
  }

  public canTransitionTo(newState: VisitorState): boolean {
    const validTransitions: Record<VisitorState, VisitorState[]> = {
      [VisitorState.ANONYMOUS]: [
        VisitorState.IDENTIFIED,
        VisitorState.IN_CHAT,
        VisitorState.INACTIVE,
        VisitorState.CONNECTED,
      ],
      [VisitorState.IDENTIFIED]: [
        VisitorState.IN_CHAT,
        VisitorState.CONVERTED,
        VisitorState.INACTIVE,
        VisitorState.CONNECTED,
        VisitorState.DISCONNECTED,
      ],
      [VisitorState.CONNECTED]: [
        VisitorState.IDENTIFIED,
        VisitorState.IN_CHAT,
        VisitorState.DISCONNECTED,
        VisitorState.INACTIVE,
      ],
      [VisitorState.DISCONNECTED]: [
        VisitorState.CONNECTED,
        VisitorState.ANONYMOUS,
        VisitorState.INACTIVE,
      ],
      [VisitorState.IN_CHAT]: [
        VisitorState.IDENTIFIED,
        VisitorState.CONVERTED,
        VisitorState.INACTIVE,
        VisitorState.DISCONNECTED,
      ],
      [VisitorState.CONVERTED]: [
        VisitorState.INACTIVE,
        VisitorState.DISCONNECTED,
      ],
      [VisitorState.INACTIVE]: [
        VisitorState.ANONYMOUS,
        VisitorState.IDENTIFIED,
        VisitorState.CONNECTED,
      ],
    };

    return validTransitions[this._value].includes(newState);
  }

  public equals(other: VisitorStateVO): boolean {
    return this._value === other._value;
  }

  private ensureIsValidState(state: VisitorState): void {
    if (!Object.values(VisitorState).includes(state)) {
      throw new Error(`Estado de visitante inválido: ${state}`);
    }
  }
}
