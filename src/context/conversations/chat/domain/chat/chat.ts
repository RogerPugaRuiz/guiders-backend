import { ChatId } from './value-objects/chat-id';
import { LastMessage } from './value-objects/last-message';
import { LastMessageAt } from './value-objects/last-message-at';
import { Status } from './value-objects/status';
import { AggregateRoot } from '@nestjs/cqrs';
import { Participants } from './participants';
import { NewChatCreatedEvent } from './events/new-chat-created.event';
import { StatusUpdatedEvent } from './events/status-updated.event';
import { CreatedAt } from 'src/context/conversations/message/domain/value-objects/created-at';
import { ParticipantAssignedEvent } from './events/participant-assigned.event';
import { ParticipantUnassignedEvent } from './events/participant-unassigned.event';
import { ParticipantOnlineStatusUpdatedEvent } from './events/participant-online-status-updated.event';
import { MessagePrimitives } from 'src/context/conversations/message/domain/message';
import { ChatUpdatedWithNewMessageEvent } from './events/chat-updated-with-new-message.event';
import { ParticipantSeenAtEvent } from './events/participant-seen-at.event';
import { ParticipantUnseenAtEvent } from './events/participant-unseen-at.event';

export interface ParticipantPrimitives {
  id: string;
  name: string;
  isCommercial: boolean;
  isVisitor: boolean;
  isOnline: boolean;
  assignedAt: Date;
  lastSeenAt: Date | null;
  isViewing: boolean;
  isTyping: boolean;
  isAnonymous: boolean;
}

export interface ChatPrimitives {
  id: string;
  participants: ParticipantPrimitives[];
  status: string;
  lastMessage: string | null;
  lastMessageAt: Date | null;
  createdAt: Date;
}

export class Chat extends AggregateRoot {
  private constructor(
    readonly id: ChatId,
    readonly status: Status,
    readonly participants: Participants,
    readonly lastMessage: LastMessage | null,
    readonly lastMessageAt: LastMessageAt | null,
    readonly createdAt: CreatedAt,
  ) {
    super();
  }

  public static fromPrimitives(params: {
    id: string;
    participants: {
      id: string;
      name: string;
      isCommercial: boolean;
      isVisitor: boolean;
      isOnline?: boolean;
      assignedAt?: Date;
      lastSeenAt?: Date | null;
      isViewing?: boolean;
      isTyping?: boolean;
    }[];
    status: string;
    lastMessage: string | null | undefined;
    lastMessageAt: Date | null | undefined;
    createdAt: Date;
  }): Chat {
    return new Chat(
      ChatId.create(params.id),
      Status.create(params.status),
      Participants.create(params.participants),
      params.lastMessage ? LastMessage.create(params.lastMessage) : null,
      params.lastMessageAt
        ? LastMessageAt.create(new Date(params.lastMessageAt))
        : null,
      CreatedAt.create(new Date(params.createdAt)),
    );
  }

  public static createPendingChat(params: {
    createdAt: Date;
    chatId: string;
    visitor: { id: string; name: string };
  }): Chat {
    const visitor = params.visitor;
    const createdAt = params.createdAt;
    const participants = Participants.create([
      {
        id: visitor.id,
        name: visitor.name,
        isCommercial: false,
        isVisitor: true,
      },
    ]);

    const pendingChat = new Chat(
      ChatId.create(params.chatId),
      Status.PENDING,
      participants,
      null,
      null,
      CreatedAt.create(createdAt),
    );

    pendingChat.apply(
      new NewChatCreatedEvent({
        chat: pendingChat.toPrimitives(),
        publisherId: visitor.id,
      }),
    );

    return pendingChat;
  }

  public hasParticipant(participantId: string): boolean {
    return this.participants.hasParticipant(participantId);
  }

  public participantSeenAt(participantId: string, lastSeenAt: Date): Chat {
    const participantOptional = this.participants.getParticipant(participantId);

    if (participantOptional.isEmpty()) {
      throw new Error('Participant not found');
    }
    const participant = participantOptional.get();
    const previousSeenAt = participant.lastSeenAt;
    const previousIsViewing = participant.isViewing;
    this.participants.setSeenAt(participantId, lastSeenAt);

    this.apply(
      new ParticipantSeenAtEvent({
        attributes: {
          chat: this.toPrimitives(),
          participantUpdate: {
            id: participantId,
            previousSeen: previousSeenAt,
            previousIsViewing: previousIsViewing,
          },
        },
        timestamp: new Date().getTime(),
      }),
    );

    return this;
  }

  public participantUnseenAt(participantId: string, lastSeenAt: Date): Chat {
    const participantOptional = this.participants.getParticipant(participantId);
    if (participantOptional.isEmpty()) {
      throw new Error('Participant not found');
    }
    const previousSeenAt = participantOptional.get().lastSeenAt;
    const previousIsViewing = participantOptional.get().isViewing;
    this.participants.setUnseenAt(participantId, lastSeenAt);
    this.apply(
      new ParticipantUnseenAtEvent({
        attributes: {
          chat: this.toPrimitives(),
          participantUpdate: {
            id: participantId,
            previousSeen: previousSeenAt,
            previousIsViewing: previousIsViewing,
          },
        },
        timestamp: new Date().getTime(),
      }),
    );

    return this;
  }

  public asignCommercial(commercial: { id: string; name: string }): Chat {
    this.participants.addParticipant(
      commercial.id,
      commercial.name,
      true,
      false,
    );

    const participantOptional = this.participants.getParticipant(commercial.id);

    if (participantOptional.isEmpty()) {
      throw new Error('Participant not found');
    }

    const participant = participantOptional.get();

    this.apply(
      new ParticipantAssignedEvent({
        chat: this.toPrimitives(),
        newParticipant: {
          id: participant.id,
          name: participant.name,
          isCommercial: participant.isCommercial,
          isVisitor: participant.isVisitor,
          isOnline: participant.isOnline,
          assignedAt: participant.assignedAt,
          lastSeenAt: participant.lastSeenAt,
          isViewing: participant.isViewing,
          isTyping: participant.isTyping,
          isAnonymous: participant.isAnonymous,
        },
      }),
    );

    return this;
  }

  public removeCommercial(commercialId: string): Chat {
    // Verificamos que el participante existe y es comercial
    const participantOptional = this.participants.getParticipant(commercialId);

    if (participantOptional.isEmpty()) {
      // Creamos un error estándar para cumplir con ESLint
      const error = new Error('Participant not found');
      error.name = 'ParticipantNotFoundError';
      throw error;
    }

    const participant = participantOptional.get();

    if (!participant.isCommercial) {
      // Creamos un error estándar para cumplir con ESLint
      const error = new Error('Participant is not a commercial');
      error.name = 'ParticipantNotCommercialError';
      throw error;
    }

    // Removemos el participante de la lista
    this.participants.removeParticipant(commercialId);

    // Aplicamos el evento de desasignación
    this.apply(
      new ParticipantUnassignedEvent({
        chat: this.toPrimitives(),
        removedParticipant: {
          id: participant.id,
          name: participant.name,
          isCommercial: participant.isCommercial,
          isVisitor: participant.isVisitor,
          isOnline: participant.isOnline,
          assignedAt: participant.assignedAt,
          lastSeenAt: participant.lastSeenAt,
          isViewing: participant.isViewing,
          isTyping: participant.isTyping,
          isAnonymous: participant.isAnonymous,
        },
      }),
    );

    return this;
  }

  public canAddMessage(message: MessagePrimitives): Chat {
    if (this.status.equals(Status.CLOSED)) {
      throw new Error('Chat is closed');
    }

    if (this.lastMessageAt && message.createdAt <= this.lastMessageAt.value) {
      throw new Error('Message is older than last message');
    }

    const lastMessage = LastMessage.create(message.content);
    const lastMessageAt = LastMessageAt.create(message.createdAt);
    this.participants.setSeenAt(message.senderId, message.createdAt);

    const isPendingWithCommercial =
      this.status.equals(Status.PENDING) &&
      this.participants
        .getParticipant(message.senderId)
        .map((participant) => participant.isCommercial)
        .orElse(false);

    const updatedStatus = isPendingWithCommercial ? Status.ACTIVE : this.status;

    const updatedChat = new Chat(
      this.id,
      updatedStatus,
      this.participants,
      lastMessage,
      lastMessageAt,
      this.createdAt,
    );

    if (isPendingWithCommercial) {
      updatedChat.apply(
        new StatusUpdatedEvent({
          timestamp: new Date(),
          attributes: {
            chat: updatedChat.toPrimitives(),
            oldStatus: this.status.value,
          },
        }),
      );
    }

    updatedChat.apply(
      new ChatUpdatedWithNewMessageEvent({
        chat: updatedChat.toPrimitives(),
        message,
      }),
    );

    return updatedChat;
  }

  public confirmChat(): Chat {
    if (this.status.value !== 'PENDING') {
      throw new Error('Chat is not pending');
    }
    const updatedChat = new Chat(
      this.id,
      Status.ACTIVE,
      this.participants,
      this.lastMessage,
      this.lastMessageAt,
      this.createdAt,
    );
    updatedChat.apply(
      new StatusUpdatedEvent({
        timestamp: new Date(),
        attributes: {
          chat: updatedChat.toPrimitives(),
          oldStatus: this.status.value,
        },
      }),
    );
    return updatedChat;
  }

  public participantOnline(participantId: string, isOnline: boolean): Chat {
    const participantOptional = this.participants.getParticipant(participantId);
    if (participantOptional.isEmpty()) {
      throw new Error('Participant not found');
    }

    const previousSeenAt = participantOptional.get().lastSeenAt;
    const previousIsViewing = participantOptional.get().isViewing;
    const previousOnlineStatus = participantOptional.get().isOnline;

    this.participants.setOnline(participantId, isOnline);
    this.participants.setViewing(participantId, false);

    const attributes = {
      updatedParticipant: {
        id: participantId,
        previousOnlineStatus: previousOnlineStatus,
      },
      chat: this.toPrimitives(),
    };
    this.apply(new ParticipantOnlineStatusUpdatedEvent(attributes));
    this.apply(
      new ParticipantUnseenAtEvent({
        attributes: {
          participantUpdate: {
            id: participantId,
            previousSeen: previousSeenAt,
            previousIsViewing: previousIsViewing,
          },
          chat: this.toPrimitives(),
        },
        timestamp: new Date().getTime(),
      }),
    );

    return this;
  }

  public isVisitorOnline(): boolean {
    return this.participants.value.some(
      (participant) => participant.isVisitor && participant.isOnline,
    );
  }

  public toPrimitives(): ChatPrimitives {
    return {
      id: this.id.value,
      participants: this.participants.value.map((participant) => ({
        id: participant.id,
        name: participant.name,
        isCommercial: participant.isCommercial,
        isVisitor: participant.isVisitor,
        isOnline: participant.isOnline,
        assignedAt: participant.assignedAt,
        lastSeenAt: participant.lastSeenAt,
        isViewing: participant.isViewing,
        isTyping: participant.isTyping,
      })),
      status: this.status.value,
      lastMessage: this.lastMessage ? this.lastMessage.value : null,
      lastMessageAt: this.lastMessageAt ? this.lastMessageAt.value : null,
      createdAt: this.createdAt.value,
    };
  }
}
