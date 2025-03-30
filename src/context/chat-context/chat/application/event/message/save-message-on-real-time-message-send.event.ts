import { Inject, Logger } from '@nestjs/common';
import { EventPublisher, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { RealTimeMessageSendEvent } from 'src/context/real-time-context/websocket/domain/events/real-time-message-send.event';
import {
  CHAT_REPOSITORY,
  IChatRepository,
} from '../../../domain/chat/chat.repository';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';
import { Chat } from '../../../domain/chat/chat';
import {
  IMessageRepository,
  MESSAGE_REPOSITORY,
} from '../../../domain/message/message.repository';
import { Message } from '../../../domain/message/message';
import { ChatId } from '../../../domain/chat/value-objects/chat-id';
import { Content } from '../../../domain/message/value-objects/content';
import { SenderId } from '../../../domain/message/value-objects/sender-id';

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
                  message,
                  timestamp,
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
                  message,
                  timestamp,
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
