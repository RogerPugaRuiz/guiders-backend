import { AggregateRoot } from '@nestjs/cqrs';
import { VisitorId } from './value-objects/visitor-id';
import { TenantId } from './value-objects/tenant-id';
import { SiteId } from './value-objects/site-id';
import { VisitorFingerprint } from './value-objects/visitor-fingerprint';
import {
  VisitorLifecycle,
  VisitorLifecycleVO,
} from './value-objects/visitor-lifecycle';
import { ConnectionStatus } from './value-objects/visitor-connection';
import { Session } from './session.entity';
import { SessionId } from './value-objects/session-id';
import { VisitorCreatedEvent } from './events/visitor-created.event';
import { VisitorLifecycleChangedEvent } from './events/visitor-state-changed.event';
import { VisitorConnectionChangedEvent } from './events/visitor-connection-changed.event';
import {
  SessionStartedEvent,
  SessionEndedEvent,
} from './events/session.events';

/**
 * Primitivos para la serialización del agregado VisitorV2
 */
export interface VisitorPrimitives {
  id: string;
  tenantId: string; // opcional pero práctico
  siteId: string;
  fingerprint: string;
  lifecycle: VisitorLifecycle; // ANON/ENGAGED/LEAD/CONVERTED
  createdAt: string;
  updatedAt: string;
  sessions: ReturnType<Session['toPrimitives']>[];
}

/**
 * Agregado VisitorV2 siguiendo DDD
 * Representa un visitante en el sistema con su identificación única,
 * tenant, sitio asociado, huella digital, ciclo de vida y sesiones
 */
export class VisitorV2 extends AggregateRoot {
  private readonly id: VisitorId;
  private readonly tenantId: TenantId;
  private readonly siteId: SiteId;
  private readonly fingerprint: VisitorFingerprint;
  private lifecycle: VisitorLifecycleVO;
  private readonly createdAt: Date;
  private updatedAt: Date;
  private sessions: Session[];

  private constructor(props: {
    id: VisitorId;
    tenantId: TenantId;
    siteId: SiteId;
    fingerprint: VisitorFingerprint;
    lifecycle: VisitorLifecycleVO;
    createdAt: Date;
    updatedAt: Date;
    sessions: Session[];
  }) {
    super();
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.siteId = props.siteId;
    this.fingerprint = props.fingerprint;
    this.lifecycle = props.lifecycle;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.sessions = props.sessions;
  }

  /**
   * Método de fábrica para crear un nuevo visitante (emite evento)
   */
  public static create(props: {
    id: VisitorId;
    tenantId: TenantId;
    siteId: SiteId;
    fingerprint: VisitorFingerprint;
    lifecycle?: VisitorLifecycleVO;
  }): VisitorV2 {
    const now = new Date();
    const lifecycle = props.lifecycle || VisitorLifecycleVO.anon();
    const initialSession = Session.create(SessionId.random());

    const visitor = new VisitorV2({
      id: props.id,
      tenantId: props.tenantId,
      siteId: props.siteId,
      fingerprint: props.fingerprint,
      lifecycle,
      createdAt: now,
      updatedAt: now,
      sessions: [initialSession],
    });

    // Emitir evento de creación
    visitor.apply(
      new VisitorCreatedEvent({
        id: props.id.getValue(),
        tenantId: props.tenantId.getValue(),
        siteId: props.siteId.getValue(),
        fingerprint: props.fingerprint.getValue(),
        lifecycle: lifecycle.getValue().toString(),
        createdAt: now.toISOString(),
      }),
    );

    return visitor;
  }

  /**
   * Método de fábrica para reconstruir desde primitivos (sin eventos)
   */
  public static fromPrimitives(primitives: VisitorPrimitives): VisitorV2 {
    return new VisitorV2({
      id: new VisitorId(primitives.id),
      tenantId: new TenantId(primitives.tenantId),
      siteId: new SiteId(primitives.siteId),
      fingerprint: new VisitorFingerprint(primitives.fingerprint),
      lifecycle: new VisitorLifecycleVO(primitives.lifecycle),
      createdAt: new Date(primitives.createdAt),
      updatedAt: new Date(primitives.updatedAt),
      sessions: primitives.sessions.map((sessionPrimitives) =>
        Session.fromPrimitives(sessionPrimitives),
      ),
    });
  }

  /**
   * Convierte el agregado a primitivos para serialización
   */
  public toPrimitives(): VisitorPrimitives {
    return {
      id: this.id.getValue(),
      tenantId: this.tenantId.getValue(),
      siteId: this.siteId.getValue(),
      fingerprint: this.fingerprint.getValue(),
      lifecycle: this.lifecycle.getValue(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      sessions: this.sessions.map((session) => session.toPrimitives()),
    };
  }

  /**
   * Cambia el ciclo de vida del visitante
   */
  public changeLifecycle(newLifecycle: VisitorLifecycle): void {
    const previousLifecycle = this.lifecycle;
    if (!previousLifecycle.canTransitionTo(newLifecycle)) {
      throw new Error(
        `Transición inválida de ${previousLifecycle.getValue()} a ${newLifecycle}`,
      );
    }

    this.lifecycle = new VisitorLifecycleVO(newLifecycle);
    this.updatedAt = new Date();

    // Emitir evento de cambio de ciclo de vida
    this.apply(
      new VisitorLifecycleChangedEvent({
        id: this.id.getValue(),
        previousLifecycle: previousLifecycle.getValue().toString(),
        newLifecycle: newLifecycle.toString(),
        changedAt: this.updatedAt.toISOString(),
      }),
    );
  }

  /**
   * Marca el visitante como comprometido/engaged
   */
  public markAsEngaged(): void {
    if (this.lifecycle.isAnon()) {
      this.changeLifecycle(VisitorLifecycle.ENGAGED);
    }
  }

  /**
   * Convierte el visitante en lead
   */
  public convertToLead(): void {
    if (this.lifecycle.isAnon() || this.lifecycle.isEngaged()) {
      this.changeLifecycle(VisitorLifecycle.LEAD);
    }
  }

  /**
   * Marca el visitante como convertido
   */
  public markAsConverted(): void {
    if (this.lifecycle.isEngaged() || this.lifecycle.isLead()) {
      this.changeLifecycle(VisitorLifecycle.CONVERTED);
    }
  }

  /**
   * Inicia una nueva sesión para el visitante
   */
  public startNewSession(): void {
    const newSession = Session.create(SessionId.random());
    this.sessions.push(newSession);
    this.updatedAt = new Date();

    // Emitir evento de sesión iniciada
    this.apply(
      new SessionStartedEvent({
        visitorId: this.id.getValue(),
        sessionId: newSession.getId().getValue(),
        startedAt: newSession.getStartedAt().toISOString(),
      }),
    );
  }

  /**
   * Finaliza la sesión activa actual
   */
  public endCurrentSession(): void {
    const activeSession = this.sessions.find((session) => session.isActive());
    if (activeSession) {
      const duration = activeSession.getDuration();
      activeSession.end();
      this.updatedAt = new Date();

      // Emitir evento de sesión finalizada
      this.apply(
        new SessionEndedEvent({
          visitorId: this.id.getValue(),
          sessionId: activeSession.getId().getValue(),
          endedAt: activeSession.getEndedAt()!.toISOString(),
          duration,
        }),
      );
    }
  }

  /**
   * Actualiza la actividad de la sesión actual
   */
  public updateSessionActivity(): void {
    const activeSession = this.sessions.find((session) => session.isActive());
    if (activeSession) {
      activeSession.updateLastActivity();
      this.updatedAt = new Date();
    }
  }

  // Getters para acceso de solo lectura
  public getId(): VisitorId {
    return this.id;
  }

  public getTenantId(): TenantId {
    return this.tenantId;
  }

  public getSiteId(): SiteId {
    return this.siteId;
  }

  public getFingerprint(): VisitorFingerprint {
    return this.fingerprint;
  }

  public getLifecycle(): VisitorLifecycleVO {
    return this.lifecycle;
  }

  public getCreatedAt(): Date {
    return this.createdAt;
  }

  public getUpdatedAt(): Date {
    return this.updatedAt;
  }

  public getSessions(): Session[] {
    return [...this.sessions]; // Devolver copia para inmutabilidad
  }

  public getActiveSessions(): Session[] {
    return this.sessions.filter((session) => session.isActive());
  }

  public hasActiveSessions(): boolean {
    return this.sessions.some((session) => session.isActive());
  }

  /**
   * Verifica si el visitante está en estado anónimo
   */
  public isAnon(): boolean {
    return this.lifecycle.isAnon();
  }

  /**
   * Verifica si el visitante está comprometido/engaged
   */
  public isEngaged(): boolean {
    return this.lifecycle.isEngaged();
  }

  /**
   * Verifica si el visitante es un lead
   */
  public isLead(): boolean {
    return this.lifecycle.isLead();
  }

  /**
   * Verifica si el visitante está convertido
   */
  public isConverted(): boolean {
    return this.lifecycle.isConverted();
  }

  // ========== MÉTODOS DE GESTIÓN DE CONEXIÓN ==========
  // Estos métodos emiten eventos que serán manejados por la infraestructura para sincronizar con Redis

  /**
   * Marca el visitante como online (conectado)
   * Emite evento para que la infraestructura sincronice con Redis
   */
  public goOnline(): void {
    this.apply(
      new VisitorConnectionChangedEvent({
        visitorId: this.id.getValue(),
        previousConnection: null, // Asumimos que venía de offline
        newConnection: ConnectionStatus.ONLINE,
        timestamp: new Date().toISOString(),
      }),
    );
  }

  /**
   * Marca el visitante como activo en chat
   * Emite evento para que la infraestructura sincronice con Redis
   */
  public startChatting(): void {
    this.apply(
      new VisitorConnectionChangedEvent({
        visitorId: this.id.getValue(),
        previousConnection: ConnectionStatus.ONLINE,
        newConnection: ConnectionStatus.CHATTING,
        timestamp: new Date().toISOString(),
      }),
    );
  }

  /**
   * Marca el visitante como desconectado
   * Emite evento para que la infraestructura sincronice con Redis
   */
  public goOffline(): void {
    this.apply(
      new VisitorConnectionChangedEvent({
        visitorId: this.id.getValue(),
        previousConnection: null, // Podría venir de cualquier estado
        newConnection: ConnectionStatus.OFFLINE,
        timestamp: new Date().toISOString(),
      }),
    );
  }
}
