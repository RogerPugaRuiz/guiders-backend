import { ChatId } from './value-objects/chat-id';
import { LastMessage } from './value-objects/last-message';
import { LastMessageAt } from './value-objects/last-message-at';
import { Status } from './value-objects/status';
import { AggregateRoot } from '@nestjs/cqrs';
import { Participants } from './participants';
import { NewChatCreatedEvent } from './events/new-chat-created.event';
import { Message } from 'src/context/chat-context/message/domain/message';
import { MessageCreatedEvent } from 'src/context/chat-context/message/domain/events/message-created.event';
import { StatusUpdatedEvent } from './events/status-updated.event';
import { CreatedAt } from 'src/context/chat-context/message/domain/value-objects/created-at';
import { ParticipantAssignedEvent } from './events/participant-assigned.event';
import { ParticipantOnlineStatusUpdatedEvent } from './events/participant-online-status-updated.event';

export interface ParticipantPrimitives {
  id: string;
  name: string;
  isCommercial: boolean;
  isVisitor: boolean;
  isOnline: boolean;
}

export interface ChatPrimitives {
  id: string;
  participants: ParticipantPrimitives[];
  status: string;
  lastMessage: string | null;
  lastMessageAt: Date | null;
  createdAt: Date | null;
}

export class Chat extends AggregateRoot {
  private constructor(
    readonly id: ChatId,
    readonly status: Status,
    readonly participants: Participants,
    readonly lastMessage: LastMessage | null,
    readonly lastMessageAt: LastMessageAt | null,
    readonly createdAt: CreatedAt | null = null,
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
    }[];
    status: string;
    lastMessage: string | null | undefined;
    lastMessageAt: Date | null | undefined;
    createdAt: Date | null | undefined;
  }): Chat {
    return new Chat(
      ChatId.create(params.id),
      Status.create(params.status),
      Participants.create(params.participants),
      params.lastMessage ? LastMessage.create(params.lastMessage) : null,
      params.lastMessageAt
        ? LastMessageAt.create(new Date(params.lastMessageAt))
        : null,
      params.createdAt ? CreatedAt.create(params.createdAt) : null,
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
        },
      }),
    );

    return this;
  }

  public canAddMessage(message: Message): Chat {
    if (this.status.value === 'CLOSED') {
      throw new Error('Chat is closed');
    }

    if (
      this.lastMessageAt &&
      message.createdAt.value <= this.lastMessageAt.value
    ) {
      throw new Error('Message is older than last message');
    }

    const lastMessage = LastMessage.create(message.content.value);
    const lastMessageAt = LastMessageAt.create(message.createdAt.value);

    this.participants.setLastSeenAt(
      message.senderId.value,
      message.createdAt.value,
    );

    const updatedChat = new Chat(
      this.id,
      this.status,
      this.participants,
      lastMessage,
      lastMessageAt,
    );

    updatedChat.apply(
      new MessageCreatedEvent(
        message.id.value,
        message.chatId.value,
        message.senderId.value,
        message.content.value,
        message.createdAt.value,
      ),
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
    );
    updatedChat.apply(
      new StatusUpdatedEvent(
        this.id.value, // chatId
        this.status.value, // status
        Status.ACTIVE.value, // newStatus
      ),
    );
    return updatedChat;
  }

  public updateParticipantOnlineStatus(
    participantId: string,
    isOnline: boolean,
  ): Chat {
    const participantOptional = this.participants.getParticipant(participantId);

    if (participantOptional.isEmpty()) {
      throw new Error('Participant not found');
    }

    const participant = participantOptional.get();
    const updatedParticipant = participant.updateOnlineStatus(isOnline);

    this.participants.updateParticipant(updatedParticipant);

    const attributes = {
      updatedParticipant: {
        id: updatedParticipant.id,
        isOnline: updatedParticipant.isOnline,
      },
      chat: this.toPrimitives(),
    };
    this.apply(new ParticipantOnlineStatusUpdatedEvent(attributes));

    return this;
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
      })),
      status: this.status.value,
      lastMessage: this.lastMessage ? this.lastMessage.value : null,
      lastMessageAt: this.lastMessageAt ? this.lastMessageAt.value : null,
      createdAt: this.createdAt ? this.createdAt.value : null,
    };
  }
}
