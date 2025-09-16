import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { JoinWaitingRoomCommand } from './join-waiting-room.command';
import { Inject } from '@nestjs/common';
import {
  CHAT_V2_REPOSITORY,
  IChatRepository,
} from '../../domain/chat.repository';
import { Chat } from '../../domain/entities/chat.aggregate';
import { ChatMetadata } from '../../domain/value-objects/chat-metadata';
import { Result } from 'src/context/shared/domain/result';

@CommandHandler(JoinWaitingRoomCommand)
export class JoinWaitingRoomCommandHandler
  implements
    ICommandHandler<
      JoinWaitingRoomCommand,
      { chatId: string; position: number }
    >
{
  constructor(
    @Inject(CHAT_V2_REPOSITORY)
    private readonly chatRepository: IChatRepository,
  ) {}

  async execute(
    command: JoinWaitingRoomCommand,
  ): Promise<{ chatId: string; position: number }> {
    const chat = Chat.createPendingChat({
      visitorId: command.visitorId,
      visitorInfo: command.visitorInfo,
      availableCommercialIds: [],
      metadata: ChatMetadata.fromPrimitives(command.metadata).toPrimitives(),
    });

    const saveResult = await this.chatRepository.save(chat);
    if (saveResult.isErr()) {
      throw saveResult.error;
    }

    const positionResult: Result<number, any> =
      await this.chatRepository.countPendingCreatedBefore(
        chat.createdAt,
        chat.metadata.isPresent()
          ? chat.metadata.get().getDepartment()
          : undefined,
      );
    const position = positionResult.isOk() ? positionResult.value + 1 : 1;
    return { chatId: chat.id.getValue(), position };
  }
}
