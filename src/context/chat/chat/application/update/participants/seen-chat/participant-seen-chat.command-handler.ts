import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { ParticipantSeenChatCommand } from './participant-seen-chat.command';
import { Inject } from '@nestjs/common';
import {
  CHAT_REPOSITORY,
  IChatRepository,
} from 'src/context/chat/chat/domain/chat/chat.repository';
import { CriteriaBuilder } from 'src/context/shared/domain/criteria-builder';
import { Chat } from 'src/context/chat/chat/domain/chat/chat';
import { Operator } from 'src/context/shared/domain/criteria';

@CommandHandler(ParticipantSeenChatCommand)
export class ParticipantSeenChatCommandHandler
  implements ICommandHandler<ParticipantSeenChatCommand>
{
  private readonly criteriaBuilder = new CriteriaBuilder<Chat>();
  constructor(
    @Inject(CHAT_REPOSITORY) private readonly chatRepository: IChatRepository,
    private readonly publisher: EventPublisher,
  ) {}
  async execute(command: ParticipantSeenChatCommand): Promise<void> {
    const { chatId, participantId, seenAt } = command.params;

    const criteria = this.criteriaBuilder
      .addFilter('id', Operator.EQUALS, chatId)
      .build();

    const optionalChat = await this.chatRepository.findOne(criteria);

    await optionalChat.fold(
      () => {
        throw new Error('Chat not found');
      },
      async ({ chat }) => {
        const newChat = chat.participantSeenAt(participantId, seenAt);
        await this.chatRepository.save(newChat);
        const chatWithEvents = this.publisher.mergeObjectContext(newChat);
        chatWithEvents.commit();
      },
    );

    return Promise.resolve();
  }
}
