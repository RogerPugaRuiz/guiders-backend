import { ChatId } from './value-objects/chat-id';
import { CommercialId } from './value-objects/commercial-id';
import { VisitorId } from './value-objects/visitor-id';
import { LastMessage } from './value-objects/last-message';
import { LastMessageAt } from './value-objects/last-message-at';
import { UnreadMessages } from './value-objects/unread-messages';
import { Status } from './value-objects/status';

export class Chat {
  private constructor(
    readonly id: ChatId,
    readonly commercialId: CommercialId,
    readonly visitorId: VisitorId,
    readonly status: Status,
    readonly lastMessage: LastMessage,
    readonly lastMessageAt: LastMessageAt,
    readonly unreadMessages: UnreadMessages,
  ) {}

  public static fromPrimitives(params: {
    id: string;
    commercialId: string;
    visitorId: string;
    status: string;
    lastMessage: string;
    lastMessageAt: Date;
    unreadMessages: number;
  }): Chat {
    return new Chat(
      ChatId.create(params.id),
      CommercialId.create(params.commercialId),
      VisitorId.create(params.visitorId),
      Status.create(params.status),
      LastMessage.create(params.lastMessage),
      LastMessageAt.create(params.lastMessageAt),
      UnreadMessages.create(params.unreadMessages),
    );
  }

  public static createNewChat(params: {
    commercialId: CommercialId;
    visitorId: VisitorId;
  }): Chat {
    return new Chat(
      ChatId.random(),
      params.commercialId,
      params.visitorId,
      Status.new(),
      LastMessage.create(''),
      LastMessageAt.create(new Date()),
      UnreadMessages.create(0),
    );
  }

  public addMessageFromVisitor(message: string): Chat {
    return new Chat(
      this.id,
      this.commercialId,
      this.visitorId,
      this.status,
      LastMessage.create(message),
      LastMessageAt.create(new Date()),
      this.unreadMessages.increment(),
    );
  }

  public addMessageFromCommercial(message: string): Chat {
    return new Chat(
      this.id,
      this.commercialId,
      this.visitorId,
      this.status,
      LastMessage.create(message),
      LastMessageAt.create(new Date()),
      this.unreadMessages,
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
      this.unreadMessages.decrement(),
    );
  }
}
