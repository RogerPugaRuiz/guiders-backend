import { AggregateRoot } from '@nestjs/cqrs';
import { VisitorId } from './value-objects/visitor-id';
import { DomainId } from './value-objects/domain-id';
import { VisitorFingerprint } from './value-objects/visitor-fingerprint';
import {
  VisitorState,
  VisitorStateVO,
  VisitorStateUtils,
} from './value-objects/visitor-state';
import { VisitorCreatedEvent } from './events/visitor-created.event';
import { VisitorStateChangedEvent } from './events/visitor-state-changed.event';

/**
 * Primitivos para la serialización del agregado VisitorV2
 */
export interface VisitorV2Primitives {
  id: string;
  domainId: string;
  fingerprint: string;
  state: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Agregado VisitorV2 siguiendo DDD
 * Representa un visitante en el sistema con su identificación única,
 * dominio asociado, huella digital y estado actual
 */
export class VisitorV2 extends AggregateRoot {
  private readonly id: VisitorId;
  private readonly domainId: DomainId;
  private readonly fingerprint: VisitorFingerprint;
  private state: VisitorStateVO;
  private readonly createdAt: Date;
  private updatedAt: Date;

  private constructor(props: {
    id: VisitorId;
    domainId: DomainId;
    fingerprint: VisitorFingerprint;
    state: VisitorStateVO;
    createdAt: Date;
    updatedAt: Date;
  }) {
    super();
    this.id = props.id;
    this.domainId = props.domainId;
    this.fingerprint = props.fingerprint;
    this.state = props.state;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * Método de fábrica para crear un nuevo visitante (emite evento)
   */
  public static create(props: {
    id: VisitorId;
    domainId: DomainId;
    fingerprint: VisitorFingerprint;
    state?: VisitorStateVO;
  }): VisitorV2 {
    const now = new Date();
    const state = props.state || VisitorStateVO.anonymous();

    const visitor = new VisitorV2({
      id: props.id,
      domainId: props.domainId,
      fingerprint: props.fingerprint,
      state,
      createdAt: now,
      updatedAt: now,
    });

    // Emitir evento de creación
    visitor.apply(
      new VisitorCreatedEvent({
        id: props.id.getValue(),
        domainId: props.domainId.getValue(),
        fingerprint: props.fingerprint.getValue(),
        state: state.getValue().toString(),
        createdAt: now.toISOString(),
      }),
    );

    return visitor;
  }

  /**
   * Método de fábrica para reconstruir desde primitivos (sin eventos)
   */
  public static fromPrimitives(primitives: VisitorV2Primitives): VisitorV2 {
    return new VisitorV2({
      id: new VisitorId(primitives.id),
      domainId: new DomainId(primitives.domainId),
      fingerprint: new VisitorFingerprint(primitives.fingerprint),
      state: new VisitorStateVO(VisitorStateUtils.fromValue(primitives.state)),
      createdAt: new Date(primitives.createdAt),
      updatedAt: new Date(primitives.updatedAt),
    });
  }

  /**
   * Convierte el agregado a primitivos para serialización
   */
  public toPrimitives(): VisitorV2Primitives {
    return {
      id: this.id.getValue(),
      domainId: this.domainId.getValue(),
      fingerprint: this.fingerprint.getValue(),
      state: this.state.getValue().toString(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  /**
   * Cambia el estado del visitante
   */
  public changeState(newState: VisitorState): void {
    const previousState = this.state;
    this.state = new VisitorStateVO(newState);
    this.updatedAt = new Date();

    // Emitir evento de cambio de estado
    this.apply(
      new VisitorStateChangedEvent({
        id: this.id.getValue(),
        previousState: previousState.getValue().toString(),
        newState: newState.toString(),
        changedAt: this.updatedAt.toISOString(),
      }),
    );
  }

  /**
   * Marca el visitante como identificado
   */
  public markAsIdentified(): void {
    if (this.state.isAnonymous()) {
      this.changeState(VisitorState.IDENTIFIED);
    }
  }

  /**
   * Marca el visitante como conectado
   */
  public markAsConnected(): void {
    if (!this.state.isDisconnected()) {
      this.changeState(VisitorState.CONNECTED);
    }
  }

  /**
   * Marca el visitante como desconectado
   */
  public markAsDisconnected(): void {
    this.changeState(VisitorState.DISCONNECTED);
  }

  // Getters para acceso de solo lectura
  public getId(): VisitorId {
    return this.id;
  }

  public getDomainId(): DomainId {
    return this.domainId;
  }

  public getFingerprint(): VisitorFingerprint {
    return this.fingerprint;
  }

  public getState(): VisitorStateVO {
    return this.state;
  }

  public getCreatedAt(): Date {
    return this.createdAt;
  }

  public getUpdatedAt(): Date {
    return this.updatedAt;
  }

  /**
   * Verifica si el visitante está anónimo
   */
  public isAnonymous(): boolean {
    return this.state.isAnonymous();
  }

  /**
   * Verifica si el visitante está identificado
   */
  public isIdentified(): boolean {
    return this.state.isIdentified();
  }

  /**
   * Verifica si el visitante está conectado
   */
  public isConnected(): boolean {
    return this.state.isConnected();
  }

  /**
   * Verifica si el visitante está desconectado
   */
  public isDisconnected(): boolean {
    return this.state.isDisconnected();
  }
}
