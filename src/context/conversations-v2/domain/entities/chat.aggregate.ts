import { AggregateRoot } from '@nestjs/cqrs';
import { ChatId } from '../value-objects/chat-id';
import { ChatStatus } from '../value-objects/chat-status';
import { ChatPriority } from '../value-objects/chat-priority';
import { VisitorId } from '../value-objects/visitor-id';
import { CommercialId } from '../value-objects/commercial-id';
import { VisitorInfo, VisitorInfoData } from '../value-objects/visitor-info';
import { ChatMetadata, ChatMetadataData } from '../value-objects/chat-metadata';
import { ChatCreatedEvent } from '../events/chat-created.event';
import { CommercialAssignedEvent } from '../events/commercial-assigned.event';
import { ChatClosedEvent } from '../events/chat-closed.event';
import { ChatAutoAssignmentRequestedEvent } from '../events/chat-auto-assignment-requested.event';
import { Optional } from 'src/context/shared/domain/optional';

/**
 * Interfaz para los datos primitivos del chat V2
 */
export interface ChatPrimitives {
  id: string;
  status: string;
  priority: string;
  visitorId: string;
  assignedCommercialId?: string;
  availableCommercialIds: string[];
  lastMessageDate?: Date;
  lastMessageContent?: string;
  lastMessageSenderId?: string;
  totalMessages: number;
  firstResponseTime?: Date;
  responseTimeSeconds?: number;
  closedAt?: Date;
  closedReason?: string;
  visitorInfo: VisitorInfoData;
  metadata?: ChatMetadataData;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Propiedades para crear un chat
 */
export interface ChatProperties {
  id: ChatId;
  status: ChatStatus;
  priority: ChatPriority;
  visitorId: VisitorId;
  assignedCommercialId?: CommercialId;
  availableCommercialIds: CommercialId[];
  lastMessageDate?: Date;
  lastMessageContent?: string;
  lastMessageSenderId?: string;
  totalMessages: number;
  firstResponseTime?: Date;
  responseTimeSeconds?: number;
  closedAt?: Date;
  closedReason?: string;
  visitorInfo: VisitorInfo;
  metadata?: ChatMetadata;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Entidad Chat V2 - Optimizada para flujo comercial-visitante
 */
export class Chat extends AggregateRoot {
  private constructor(
    private readonly _id: ChatId,
    private readonly _status: ChatStatus,
    private readonly _priority: ChatPriority,
    private readonly _visitorId: VisitorId,
    private readonly _assignedCommercialId: CommercialId | null,
    private readonly _availableCommercialIds: CommercialId[],
    private readonly _lastMessageDate: Date | null,
    private readonly _lastMessageContent: string | null,
    private readonly _lastMessageSenderId: string | null,
    private readonly _totalMessages: number,
    private readonly _firstResponseTime: Date | null,
    private readonly _responseTimeSeconds: number | null,
    private readonly _closedAt: Date | null,
    private readonly _closedReason: string | null,
    private readonly _visitorInfo: VisitorInfo,
    private readonly _metadata: ChatMetadata | null,
    private readonly _createdAt: Date,
    private readonly _updatedAt: Date,
  ) {
    super();
  }

  /**
   * Método de fábrica para crear un chat desde value objects
   */
  public static create(props: ChatProperties): Chat {
    const chat = new Chat(
      props.id,
      props.status,
      props.priority,
      props.visitorId,
      props.assignedCommercialId || null,
      props.availableCommercialIds,
      props.lastMessageDate || null,
      props.lastMessageContent || null,
      props.lastMessageSenderId || null,
      props.totalMessages,
      props.firstResponseTime || null,
      props.responseTimeSeconds || null,
      props.closedAt || null,
      props.closedReason || null,
      props.visitorInfo,
      props.metadata || null,
      props.createdAt,
      props.updatedAt,
    );

    // Aplica el evento de dominio al crear el chat
    chat.apply(
      new ChatCreatedEvent({
        chat: {
          chatId: chat._id.getValue(),
          visitorId: chat._visitorId.getValue(),
          companyId: 'TODO', // Se obtendrá del contexto
          status: chat._status.value,
          priority: chat._priority.value,
          visitorInfo: chat._visitorInfo.toPrimitives(),
          metadata: chat._metadata?.toPrimitives(),
          createdAt: chat._createdAt,
        },
      }),
    );

    return chat;
  }

  /**
   * Método de fábrica para reconstruir desde datos primitivos
   */
  public static fromPrimitives(params: ChatPrimitives): Chat {
    return new Chat(
      ChatId.create(params.id),
      new ChatStatus(params.status),
      new ChatPriority(params.priority),
      VisitorId.create(params.visitorId),
      params.assignedCommercialId
        ? CommercialId.create(params.assignedCommercialId)
        : null,
      params.availableCommercialIds.map((id) => CommercialId.create(id)),
      params.lastMessageDate || null,
      params.lastMessageContent || null,
      params.lastMessageSenderId || null,
      params.totalMessages,
      params.firstResponseTime || null,
      params.responseTimeSeconds || null,
      params.closedAt || null,
      params.closedReason || null,
      VisitorInfo.fromPrimitives(params.visitorInfo),
      params.metadata ? ChatMetadata.fromPrimitives(params.metadata) : null,
      params.createdAt,
      params.updatedAt,
    );
  }

  /**
   * Crea un chat pendiente para un visitante
   */
  public static createPendingChat(params: {
    visitorId: string;
    visitorInfo: VisitorInfoData;
    availableCommercialIds: string[];
    priority?: string;
    metadata?: ChatMetadataData;
    autoAssign?: boolean;
    autoAssignOptions?: {
      requiredSkills?: string[];
      strategy?: string;
      maxWaitTimeSeconds?: number;
    };
  }): Chat {
    const now = new Date();

    const chat = Chat.create({
      id: ChatId.generate(),
      status: ChatStatus.PENDING,
      priority: new ChatPriority(params.priority || 'NORMAL'),
      visitorId: VisitorId.create(params.visitorId),
      availableCommercialIds: params.availableCommercialIds.map((id) =>
        CommercialId.create(id),
      ),
      totalMessages: 0,
      visitorInfo: VisitorInfo.fromPrimitives(params.visitorInfo),
      metadata: params.metadata
        ? ChatMetadata.fromPrimitives(params.metadata)
        : undefined,
      createdAt: now,
      updatedAt: now,
    });

    // Si se solicita auto-asignación, emitir el evento
    if (params.autoAssign && params.availableCommercialIds.length > 0) {
      chat.requestAutoAssignment({
        ...params.autoAssignOptions,
        reason: 'chat_created_with_auto_assign',
      });
    }

    return chat;
  }

  /**
   * Asigna un comercial al chat
   */
  public assignCommercial(commercialId: string): Chat {
    if (!this._status.canBeAssigned()) {
      throw new Error('El chat no puede ser asignado en su estado actual');
    }

    const commercial = CommercialId.create(commercialId);
    const now = new Date();

    const updatedChat = new Chat(
      this._id,
      ChatStatus.ASSIGNED,
      this._priority,
      this._visitorId,
      commercial,
      this._availableCommercialIds,
      this._lastMessageDate,
      this._lastMessageContent,
      this._lastMessageSenderId,
      this._totalMessages,
      this._firstResponseTime,
      this._responseTimeSeconds,
      this._closedAt,
      this._closedReason,
      this._visitorInfo,
      this._metadata,
      this._createdAt,
      now,
    );

    updatedChat.apply(
      new CommercialAssignedEvent({
        assignment: {
          chatId: this._id.getValue(),
          commercialId: commercialId,
          visitorId: this._visitorId.getValue(),
          previousStatus: this._status.value,
          newStatus: ChatStatus.ASSIGNED.value,
          assignedAt: now,
          assignmentReason: 'auto',
        },
      }),
    );

    return updatedChat;
  }

  /**
   * Solicita asignación automática del chat
   * Emite un evento que será procesado por el domain service
   */
  public requestAutoAssignment(options?: {
    requiredSkills?: string[];
    strategy?: string;
    maxWaitTimeSeconds?: number;
    reason?: string;
  }): Chat {
    if (!this._status.canBeAssigned()) {
      throw new Error('El chat no puede ser auto-asignado en su estado actual');
    }

    if (this._availableCommercialIds.length === 0) {
      throw new Error('No hay comerciales disponibles para auto-asignación');
    }

    const now = new Date();

    // Emitir evento de solicitud de auto-asignación
    this.apply(
      new ChatAutoAssignmentRequestedEvent({
        autoAssignment: {
          chatId: this._id.getValue(),
          visitorId: this._visitorId.getValue(),
          availableCommercialIds: this._availableCommercialIds.map((id) =>
            id.getValue(),
          ),
          priority: this._priority.value,
          requiredSkills: options?.requiredSkills,
          strategy: options?.strategy,
          maxWaitTimeSeconds: options?.maxWaitTimeSeconds,
          requestedAt: now,
          reason: options?.reason || 'auto_assignment_requested',
        },
      }),
    );

    return this;
  }

  /**
   * Cierra el chat con una razón específica
   */
  public close(closedBy: string, reason: string): Chat {
    if (this._status.isClosed()) {
      throw new Error('El chat ya está cerrado');
    }

    const now = new Date();
    const duration = this._createdAt
      ? Math.floor((now.getTime() - this._createdAt.getTime()) / 1000)
      : 0;

    const updatedChat = new Chat(
      this._id,
      ChatStatus.CLOSED,
      this._priority,
      this._visitorId,
      this._assignedCommercialId,
      this._availableCommercialIds,
      this._lastMessageDate,
      this._lastMessageContent,
      this._lastMessageSenderId,
      this._totalMessages,
      this._firstResponseTime,
      this._responseTimeSeconds,
      now,
      reason,
      this._visitorInfo,
      this._metadata,
      this._createdAt,
      now,
    );

    updatedChat.apply(
      new ChatClosedEvent({
        closure: {
          chatId: this._id.getValue(),
          visitorId: this._visitorId.getValue(),
          commercialId: this._assignedCommercialId?.getValue(),
          closedBy,
          reason,
          previousStatus: this._status.value,
          closedAt: now,
          duration,
          totalMessages: this._totalMessages,
          firstResponseTime: this._responseTimeSeconds ?? undefined,
        },
      }),
    );

    return updatedChat;
  }

  /**
   * Serializa la entidad a un objeto plano
   */
  public toPrimitives(): ChatPrimitives {
    return {
      id: this._id.getValue(),
      status: this._status.value,
      priority: this._priority.value,
      visitorId: this._visitorId.getValue(),
      assignedCommercialId: this._assignedCommercialId?.getValue(),
      availableCommercialIds: this._availableCommercialIds.map((id) =>
        id.getValue(),
      ),
      lastMessageDate: this._lastMessageDate ?? undefined,
      lastMessageContent: this._lastMessageContent ?? undefined,
      lastMessageSenderId: this._lastMessageSenderId ?? undefined,
      totalMessages: this._totalMessages,
      firstResponseTime: this._firstResponseTime ?? undefined,
      responseTimeSeconds: this._responseTimeSeconds ?? undefined,
      closedAt: this._closedAt ?? undefined,
      closedReason: this._closedReason ?? undefined,
      visitorInfo: this._visitorInfo.toPrimitives(),
      metadata: this._metadata?.toPrimitives(),
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  // Getters de solo lectura
  get id(): ChatId {
    return this._id;
  }

  get status(): ChatStatus {
    return this._status;
  }

  get priority(): ChatPriority {
    return this._priority;
  }

  get visitorId(): VisitorId {
    return this._visitorId;
  }

  get assignedCommercialId(): Optional<CommercialId> {
    return this._assignedCommercialId
      ? Optional.of(this._assignedCommercialId)
      : Optional.empty();
  }

  get availableCommercialIds(): CommercialId[] {
    return this._availableCommercialIds;
  }

  get totalMessages(): number {
    return this._totalMessages;
  }

  get visitorInfo(): VisitorInfo {
    return this._visitorInfo;
  }

  get metadata(): Optional<ChatMetadata> {
    return this._metadata ? Optional.of(this._metadata) : Optional.empty();
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Verifica si el chat está asignado a un comercial específico
   */
  public isAssignedTo(commercialId: string): boolean {
    return this._assignedCommercialId?.getValue() === commercialId;
  }

  /**
   * Verifica si el comercial está disponible para este chat
   */
  public isCommercialAvailable(commercialId: string): boolean {
    return this._availableCommercialIds.some(
      (id) => id.getValue() === commercialId,
    );
  }

  /**
   * Verifica si el chat puede recibir mensajes
   */
  public canReceiveMessages(): boolean {
    return this._status.canReceiveMessages();
  }
}
