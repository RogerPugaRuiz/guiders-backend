import { ChatId } from './value-objects/chat-id';
import { CommercialId } from './value-objects/commercial-id';
import { VisitorId } from './value-objects/visitor-id';
import { LastMessage } from './value-objects/last-message';
import { LastMessageAt } from './value-objects/last-message-at';
import { Status } from './value-objects/status';
import { Optional } from 'src/context/shared/domain/optional';
import { AggregateRoot } from '@nestjs/cqrs';
import { NewChatCreatedEvent } from './events/new-chat-created.event';

export interface ChatPrimitives {
  id: string;
  commercialId: string | null;
  visitorId: string;
  status: string;
  lastMessage: string | null;
  lastMessageAt: Date | null;
}

export class Chat extends AggregateRoot {
  private constructor(
    readonly id: ChatId,
    readonly commercialId: Optional<CommercialId>,
    readonly visitorId: VisitorId,
    readonly status: Status,
    readonly lastMessage: Optional<LastMessage>,
    readonly lastMessageAt: Optional<LastMessageAt>,
  ) {
    super();
  }

  public static fromPrimitives(params: ChatPrimitives): Chat {
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
    };
  }

  public addMessageFromVisitor(message: string): Chat {
    return new Chat(
      this.id,
      this.commercialId,
      this.visitorId,
      this.status,
      Optional.of(LastMessage.create(message)),
      Optional.of(LastMessageAt.create(new Date())),
    );
  }

  public addMessageFromCommercial(message: string): Chat {
    return new Chat(
      this.id,
      this.commercialId,
      this.visitorId,
      this.status,
      Optional.of(LastMessage.create(message)),
      Optional.of(LastMessageAt.create(new Date())),
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
    );
  }
}
