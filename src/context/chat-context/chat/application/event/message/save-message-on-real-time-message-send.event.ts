import { Inject, Logger } from '@nestjs/common';
import { EventPublisher, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Message } from 'src/context/chat-context/message/domain/message';
import {
  MESSAGE_REPOSITORY,
  IMessageRepository,
} from 'src/context/chat-context/message/domain/message.repository';
import { Content } from 'src/context/chat-context/message/domain/value-objects/content';
import { SenderId } from 'src/context/chat-context/message/domain/value-objects/sender-id';
import { RealTimeMessageSendEvent } from 'src/context/real-time-context/websocket/domain/events/real-time-message-send.event';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';
import { Chat } from '../../../domain/chat/chat';
import {
  CHAT_REPOSITORY,
  IChatRepository,
} from '../../../domain/chat/chat.repository';
import { ChatId } from '../../../domain/chat/value-objects/chat-id';
import { LastMessage } from '../../../domain/chat/value-objects/last-message';
import { LastMessageAt } from '../../../domain/chat/value-objects/last-message-at';
import { CommercialId } from '../../../domain/chat/value-objects/commercial-id';

@EventsHandler(RealTimeMessageSendEvent)
export class SaveMessageOnRealTimeMessageSendEvent
  implements IEventHandler<RealTimeMessageSendEvent>
{
  private readonly logger = new Logger(
    SaveMessageOnRealTimeMessageSendEvent.name,
  );

  constructor(
    @Inject(CHAT_REPOSITORY) private readonly chatRepository: IChatRepository,
    @Inject(MESSAGE_REPOSITORY)
    private readonly messageRepository: IMessageRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async handle(event: RealTimeMessageSendEvent): Promise<void> {
    const { from, to, direction, message, timestamp } = event;
    const criteria = new Criteria<Chat>();

    switch (direction) {
      case 'toVisitor':
        criteria.addFilter('commercialId', Operator.EQUALS, from);
        criteria.addFilter('visitorId', Operator.EQUALS, to);
        break;
      case 'toCommercial':
        criteria.addFilter('commercialId', Operator.EQUALS, to);
        criteria.addFilter('visitorId', Operator.EQUALS, from);
        break;
    }

    const optionalChat = await this.chatRepository.findOne(criteria);
    await optionalChat.fold(
      async () => {
        this.logger.error('Chat not found');
        return Promise.resolve();
      },
      async ({ chat }) => {
        this.logger.log('Chat found', chat);

        switch (direction) {
          case 'toVisitor': {
            try {
              const updatedchat =
                chat.updateChatOnCommercialMessageSendToVisitor({
                  message: LastMessage.create(message),
                  timestamp: LastMessageAt.create(timestamp),
                  commercialId: CommercialId.create(from),
                });

              this.publisher.mergeObjectContext(updatedchat).commit();

              await this.chatRepository.save(updatedchat);
            } catch (error) {
              this.logger.error('Error updating chat', error);
              return Promise.resolve();
            }

            break;
          }
          case 'toCommercial': {
            try {
              const updatedchat =
                chat.updateChatOnVisitorMessageSendToCommercial({
                  message: LastMessage.create(message),
                  timestamp: LastMessageAt.create(timestamp),
                });

              this.publisher.mergeObjectContext(updatedchat).commit();

              await this.chatRepository.save(updatedchat);
            } catch (error) {
              this.logger.error('Error updating chat', error);
              return Promise.resolve();
            }
            break;
          }
        }

        const newMessage = Message.createNewMessage({
          chatId: ChatId.create(chat.id.value),
          content: Content.create(message),
          senderId: SenderId.create(from),
        });

        this.publisher.mergeObjectContext(newMessage).commit();

        await this.messageRepository.save(newMessage);

        this.logger.log('Chat saved', chat);
        return Promise.resolve();
      },
    );
  }
}
