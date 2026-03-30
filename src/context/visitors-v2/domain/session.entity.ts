import { SessionId } from './value-objects/session-id';

/**
 * Primitivos para la serialización de Session
 */
export interface SessionPrimitives {
  id: string;
  startedAt: string;
  lastActivityAt: string;
  endedAt?: string;
  currentUrl?: string;
  ipAddress?: string; // IP desde la que se inició la sesión
  userAgent?: string; // User-Agent del navegador
}

/**
 * Entidad Session que representa una sesión de usuario
 */
export class Session {
  private readonly id: SessionId;
  private readonly startedAt: Date;
  private lastActivityAt: Date;
  private endedAt?: Date;
  private currentUrl?: string;
  private readonly ipAddress?: string; // IP desde la que se inició la sesión (inmutable)
  private readonly userAgent?: string; // User-Agent del navegador (inmutable)

  constructor(props: {
    id: SessionId;
    startedAt: Date;
    lastActivityAt: Date;
    endedAt?: Date;
    currentUrl?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    this.id = props.id;
    this.startedAt = props.startedAt;
    this.lastActivityAt = props.lastActivityAt;
    this.endedAt = props.endedAt;
    this.currentUrl = props.currentUrl;
    this.ipAddress = props.ipAddress;
    this.userAgent = props.userAgent;
  }

  /**
   * Crea una nueva sesión que acaba de comenzar
   */
  public static create(
    id: SessionId,
    ipAddress?: string,
    userAgent?: string,
  ): Session {
    const now = new Date();
    return new Session({
      id,
      startedAt: now,
      lastActivityAt: now,
      ipAddress,
      userAgent,
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
      currentUrl: primitives.currentUrl,
      ipAddress: primitives.ipAddress,
      userAgent: primitives.userAgent,
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
      currentUrl: this.currentUrl,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
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

  public getCurrentUrl(): string | undefined {
    return this.currentUrl;
  }

  /**
   * Actualiza la URL actual de la sesión
   */
  public updateCurrentUrl(url: string): void {
    this.currentUrl = url;
    this.lastActivityAt = new Date();
  }
}
