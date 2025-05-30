import {
  CommandBus,
  CommandHandler,
  ICommandHandler,
  QueryBus,
} from '@nestjs/cqrs';
import { RealTimeMessageSenderCommand } from './real-time-message-sender.command';
import { err, okVoid, Result } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { Inject } from '@nestjs/common';
import {
  CONNECTION_REPOSITORY,
  ConnectionRepository,
} from '../../../domain/connection.repository';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';
import { ConnectionUser } from '../../../domain/connection-user';
import { Optional } from 'src/context/shared/domain/optional';
import { RealTimeMessageSenderError } from '../../../domain/errors/connection-user-not-found';
import { ChatPrimitives } from 'src/context/conversations/features/chat/domain/chat/chat';
import { FindOneChatByIdQuery } from 'src/context/conversations/features/chat/application/read/find-one-chat-by-id.query';
import { ChatNotFoundError } from 'src/context/conversations/features/chat/domain/chat/errors/errors';
import { SaveMessageCommand } from 'src/context/conversations/features/chat/application/create/message/save-message.command';
import {
  DomainErrorWrapper,
  DomainErrorWrapperBuilder,
} from 'src/context/shared/domain/wrapper-error';
import { INotification, NOTIFICATION } from '../../../domain/notification';

@CommandHandler(RealTimeMessageSenderCommand)
export class RealTimeMessageSenderCommandHandler
  implements
    ICommandHandler<RealTimeMessageSenderCommand, Result<void, DomainError>>
{
  constructor(
    @Inject(NOTIFICATION)
    private readonly notification: INotification,
    @Inject(CONNECTION_REPOSITORY)
    private readonly repository: ConnectionRepository,
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}
  async execute(
    command: RealTimeMessageSenderCommand,
  ): Promise<Result<void, DomainError>> {
    const { id, chatId, createdAt, message, senderId } = command;

    const chatOptional = await this.getChat(chatId);
    if (chatOptional.isEmpty()) {
      return err(new RealTimeMessageSenderError('Chat not found'));
    }
    const chat = chatOptional.get();

    // get sender
    const senderOptional = await this.getUserById(senderId);
    if (senderOptional.isEmpty()) {
      return err(new RealTimeMessageSenderError('Sender not found'));
    }
    const sender = senderOptional.get();

    // const isVisitor = chat.participants.find(
    //   (p) => p.id === senderId,
    // )?.isVisitor;

    // get receiver
    const receiverParticipants = chat.participants.filter(
      (p) => p.id !== senderId,
    );
    // const receiverParticipants = chat.participants;

    const receivers: ConnectionUser[] = [];
    for (const participant of receiverParticipants) {
      const receiverOptional = await this.getUserById(participant.id);
      if (receiverOptional.isPresent()) {
        const receiver = receiverOptional.get();
        receivers.push(receiver);
      }
    }
    // --- PROCESS MESSAGE ---
    // Emit the message to the sender
    const messageResult = await this.emitMessage({
      sender,
      receivers,
      chat,
      message,
      createdAt,
      id,
    });
    if (messageResult.isErr()) {
      const errors = messageResult.error;
      return err(new RealTimeMessageSenderError(errors.message));
    }

    // save message to database
    if (messageResult.isOk()) {
      const saveMessageCommand = new SaveMessageCommand(
        id,
        chat.id,
        senderId,
        message,
        createdAt,
      );
      return await this.commandBus.execute<
        SaveMessageCommand,
        Result<void, DomainError>
      >(saveMessageCommand);
    }

    return okVoid();
  }

  private async getChat(chatId: string): Promise<Optional<ChatPrimitives>> {
    const query = new FindOneChatByIdQuery(chatId);
    const result = await this.queryBus.execute<
      FindOneChatByIdQuery,
      Promise<Result<{ chat: ChatPrimitives }, ChatNotFoundError>>
    >(query);
    return result.fold(
      () => {
        // Handle error
        return Optional.empty();
      },
      ({ chat }) => {
        return Optional.of(chat);
      },
    );
  }

  private async getUserById(userId: string): Promise<Optional<ConnectionUser>> {
    const criteria = new Criteria<ConnectionUser>().addFilter(
      'userId',
      Operator.EQUALS,
      userId,
    );
    const result = await this.repository.findOne(criteria);

    return result.fold(
      () => {
        // Handle error
        return Optional.empty();
      },
      (user) => {
        return Optional.of(user);
      },
    );
  }

  private async emitMessage(params: {
    sender: ConnectionUser;
    receivers: ConnectionUser[];
    chat: ChatPrimitives;
    message: string;
    createdAt: Date;
    id: string;
  }): Promise<Result<void, DomainErrorWrapper>> {
    const { sender, receivers, chat, message, createdAt, id } = params;
    const errorWrapperBuilder = new DomainErrorWrapperBuilder();
    console.log(
      `Emitting message to ${receivers.length} receivers: ${JSON.stringify(
        receivers,
      )}`,
    );
    if (receivers.length === 0) {
      return err(
        errorWrapperBuilder
          .add(new RealTimeMessageSenderError('No receivers'))
          .build(),
      );
    }
    for (const receiver of receivers) {
      if (receiver.isConnected()) {
        await this.notification.notify({
          recipientId: receiver.userId.value,
          type: 'receive-message',
          payload: {
            id,
            chatId: chat.id,
            senderId: sender.userId.value,
            message,
            createdAt,
          },
        });
      }
    }

    const errors = errorWrapperBuilder.build();
    if (errors.hasAny()) {
      return err(errors);
    }

    return okVoid();
  }
}
