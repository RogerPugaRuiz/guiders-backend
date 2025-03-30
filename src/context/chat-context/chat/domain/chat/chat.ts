import { ChatId } from './value-objects/chat-id';
import { CommercialId } from './value-objects/commercial-id';
import { VisitorId } from './value-objects/visitor-id';
import { LastMessage } from './value-objects/last-message';
import { LastMessageAt } from './value-objects/last-message-at';
import { Status } from './value-objects/status';
import { Optional } from 'src/context/shared/domain/optional';
import { AggregateRoot } from '@nestjs/cqrs';
import { NewChatCreatedEvent } from './events/new-chat-created.event';
import { ChatMessageSendEvent } from './events/chat-message-send.event';
import { VistorLastReadAt } from './value-objects/vistor-last-read-at';
import { CommercialLastReadAt } from './value-objects/commercial-last-read-at';

export interface ChatPrimitives {
  id: string;
  commercialId: string | null;
  visitorId: string;
  status: string;
  lastMessage: string | null;
  lastMessageAt: Date | null;
  visitorLastReadAt: Date | null;
  commercialLastReadAt: Date | null;
}

export class Chat extends AggregateRoot {
  private constructor(
    readonly id: ChatId,
    readonly commercialId: Optional<CommercialId>,
    readonly visitorId: VisitorId,
    readonly status: Status,
    readonly lastMessage: Optional<LastMessage>,
    readonly lastMessageAt: Optional<LastMessageAt>,
    readonly visitorLastReadAt: Optional<VistorLastReadAt>,
    readonly commercialLastReadAt: Optional<CommercialLastReadAt>,
  ) {
    super();
  }

  public static fromPrimitives(params: {
    id: string;
    commercialId: string | null | undefined;
    visitorId: string;
    status: string;
    lastMessage: string | null | undefined;
    lastMessageAt: Date | null | undefined;
    visitorLastReadAt: Date | null | undefined;
    commercialLastReadAt: Date | null | undefined;
  }): Chat {
    return new Chat(
      ChatId.create(params.id),
      Optional.ofNullable(params.commercialId).map((id) =>
        CommercialId.create(id),
      ),
      VisitorId.create(params.visitorId),
      Status.create(params.status),
      Optional.ofNullable(params.lastMessage).map((message) =>
        LastMessage.create(message),
      ),
      Optional.ofNullable(params.lastMessageAt).map((date) =>
        LastMessageAt.create(date),
      ),
      Optional.ofNullable(params.visitorLastReadAt).map((date) =>
        VistorLastReadAt.create(date),
      ),
      Optional.ofNullable(params.commercialLastReadAt).map((date) =>
        CommercialLastReadAt.create(date),
      ),
    );
  }

  public static createNewChat(params: { visitorId: VisitorId }): Chat {
    const newChat = new Chat(
      ChatId.random(),
      Optional.empty(),
      params.visitorId,
      Status.new(),
      Optional.empty(),
      Optional.empty(),
      Optional.empty(),
      Optional.empty(),
    );

    newChat.apply(
      new NewChatCreatedEvent(
        newChat.id.value,
        newChat.commercialId.map((id) => id.value).getOrNull(),
        newChat.visitorId.value,
        newChat.status.value,
        newChat.lastMessage.map((message) => message.value).getOrNull(),
        newChat.lastMessageAt.map((date) => date.value).getOrNull(),
      ),
    );

    return newChat;
  }

  public toPrimitives(): ChatPrimitives {
    return {
      id: this.id.getValue(),
      commercialId: this.commercialId.map((id) => id.getValue()).getOrNull(),
      visitorId: this.visitorId.getValue(),
      status: this.status.getValue(),
      lastMessage: this.lastMessage
        .map((message) => message.getValue())
        .getOrNull(),
      lastMessageAt: this.lastMessageAt
        .map((date) => date.getValue())
        .getOrNull(),
      visitorLastReadAt: this.visitorLastReadAt
        .map((date) => date.value)
        .getOrNull(),
      commercialLastReadAt: this.commercialLastReadAt
        .map((date) => date.value)
        .getOrNull(),
    };
  }

  public updateChatOnVisitorMessageSendToCommercial(params: {
    message: string;
    timestamp: Date;
  }): Chat {
    const { message, timestamp } = params;
    const chat = new Chat(
      this.id,
      this.commercialId,
      this.visitorId,
      this.status,
      Optional.of(LastMessage.create(message)),
      Optional.of(LastMessageAt.create(timestamp)),
      Optional.of(VistorLastReadAt.create(new Date())),
      this.commercialLastReadAt,
    );

    chat.apply(
      ChatMessageSendEvent.create({
        chatId: this.id.value,
        from: this.visitorId.value,
        to: this.commercialId.map((id) => id.value).orElseGet(() => 'all'),
        message,
        timestamp,
      }),
    );

    return chat;
  }

  public updateChatOnCommercialMessageSendToVisitor(params: {
    message: string;
    timestamp: Date;
  }): Chat {
    const { message, timestamp } = params;
    const chat = new Chat(
      this.id,
      this.commercialId,
      this.visitorId,
      Status.inProgress(),
      Optional.of(LastMessage.create(message)),
      Optional.of(LastMessageAt.create(timestamp)),
      this.visitorLastReadAt,
      Optional.of(CommercialLastReadAt.create(new Date())),
    );

    return this.commercialId.fold(
      () => {
        chat.apply(
          ChatMessageSendEvent.create({
            chatId: this.id.value,
            from: this.visitorId.value,
            to: this.visitorId.value,
            message,
            timestamp,
          }),
        );
        return chat;
      },
      (comercial) => {
        chat.apply(
          ChatMessageSendEvent.create({
            chatId: this.id.value,
            from: this.visitorId.value,
            to: comercial.value,
            message,
            timestamp,
          }),
        );
        return chat;
      },
    );
  }

  public markVisitorMessagesAsRead(): Chat {
    return new Chat(
      this.id,
      this.commercialId,
      this.visitorId,
      this.status,
      this.lastMessage,
      this.lastMessageAt,
      Optional.of(VistorLastReadAt.create(new Date())),
      this.commercialLastReadAt,
    );
  }

  public markCommercialMessagesAsRead(): Chat {
    return new Chat(
      this.id,
      this.commercialId,
      this.visitorId,
      this.status,
      this.lastMessage,
      this.lastMessageAt,
      this.visitorLastReadAt,
      Optional.of(CommercialLastReadAt.create(new Date())),
    );
  }
}
