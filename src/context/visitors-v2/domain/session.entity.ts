import { SessionId } from './value-objects/session-id';

/**
 * Primitivos para la serialización de Session
 */
export interface SessionPrimitives {
  id: string;
  startedAt: string;
  lastActivityAt: string;
  endedAt?: string;
}

/**
 * Entidad Session que representa una sesión de usuario
 */
export class Session {
  private readonly id: SessionId;
  private readonly startedAt: Date;
  private lastActivityAt: Date;
  private endedAt?: Date;

  constructor(props: {
    id: SessionId;
    startedAt: Date;
    lastActivityAt: Date;
    endedAt?: Date;
  }) {
    this.id = props.id;
    this.startedAt = props.startedAt;
    this.lastActivityAt = props.lastActivityAt;
    this.endedAt = props.endedAt;
  }

  /**
   * Crea una nueva sesión que acaba de comenzar
   */
  public static create(id: SessionId): Session {
    const now = new Date();
    return new Session({
      id,
      startedAt: now,
      lastActivityAt: now,
    });
  }

  /**
   * Reconstruye desde primitivos
   */
  public static fromPrimitives(primitives: SessionPrimitives): Session {
    return new Session({
      id: new SessionId(primitives.id),
      startedAt: new Date(primitives.startedAt),
      lastActivityAt: new Date(primitives.lastActivityAt),
      endedAt: primitives.endedAt ? new Date(primitives.endedAt) : undefined,
    });
  }

  /**
   * Convierte a primitivos para serialización
   */
  public toPrimitives(): SessionPrimitives {
    return {
      id: this.id.getValue(),
      startedAt: this.startedAt.toISOString(),
      lastActivityAt: this.lastActivityAt.toISOString(),
      endedAt: this.endedAt?.toISOString(),
    };
  }

  /**
   * Actualiza la última actividad de la sesión
   */
  public updateLastActivity(): void {
    this.lastActivityAt = new Date();
  }

  /**
   * Finaliza la sesión
   */
  public end(): void {
    if (!this.endedAt) {
      this.endedAt = new Date();
    }
  }

  /**
   * Verifica si la sesión está activa
   */
  public isActive(): boolean {
    return !this.endedAt;
  }

  /**
   * Obtiene la duración de la sesión en milisegundos
   */
  public getDuration(): number {
    const endTime = this.endedAt || new Date();
    return endTime.getTime() - this.startedAt.getTime();
  }

  // Getters
  public getId(): SessionId {
    return this.id;
  }

  public getStartedAt(): Date {
    return this.startedAt;
  }

  public getLastActivityAt(): Date {
    return this.lastActivityAt;
  }

  public getEndedAt(): Date | undefined {
    return this.endedAt;
  }
}
