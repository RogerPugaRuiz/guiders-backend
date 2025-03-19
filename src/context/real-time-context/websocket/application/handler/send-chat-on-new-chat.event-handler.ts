import { Inject } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { NewChatCreatedEvent } from 'src/context/chat-context/chat/domain/events/new-chat-created.event';
import {
  SendNewChatRealTimePort,
  SEND_NEW_CHAT_REAL_TIME_PORT,
} from '../services/send-new-chat-real-time-port';

@EventsHandler(NewChatCreatedEvent)
export class SendChatOnNewChatEventHandler
  implements IEventHandler<NewChatCreatedEvent>
{
  constructor(
    @Inject(SEND_NEW_CHAT_REAL_TIME_PORT)
    private readonly sendService: SendNewChatRealTimePort,
  ) {}
  async handle(event: NewChatCreatedEvent) {
    await this.sendService.sendNewChat({
      chatId: event.chatId,
      commercialId: event.commercialId,
      visitorId: event.visitorId,
      status: event.status,
      lastMessage: event.lastMessage,
      lastMessageAt: event.lastMessageAt,
    });
  }
}
