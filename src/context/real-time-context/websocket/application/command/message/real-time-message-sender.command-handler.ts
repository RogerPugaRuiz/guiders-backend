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
  CHAT_MESSAGE_EMITTER,
  IChatMessageEmitter,
} from '../../../domain/message-emitter';
import {
  CONNECTION_REPOSITORY,
  ConnectionRepository,
} from '../../../domain/connection.repository';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';
import { ConnectionUser } from '../../../domain/connection-user';
import { Optional } from 'src/context/shared/domain/optional';
import { RealTimeMessageSenderError } from '../../../domain/errors/connection-user-not-found';
import { ChatPrimitives } from 'src/context/chat-context/chat/domain/chat/chat';
import { FindOneChatByIdQuery } from 'src/context/chat-context/chat/application/read/find-one-chat-by-id.query';
import { ChatNotFoundError } from 'src/context/chat-context/chat/domain/chat/errors/errors';
import { SaveMessageCommand } from 'src/context/chat-context/chat/application/create/message/save-message.command';
import {
  DomainErrorWrapper,
  DomainErrorWrapperBuilder,
} from 'src/context/shared/domain/wrapper-error';

@CommandHandler(RealTimeMessageSenderCommand)
export class RealTimeMessageSenderCommandHandler
  implements
    ICommandHandler<RealTimeMessageSenderCommand, Result<void, DomainError>>
{
  constructor(
    @Inject(CHAT_MESSAGE_EMITTER)
    private readonly messageEmitter: IChatMessageEmitter,
    @Inject(CONNECTION_REPOSITORY)
    private readonly repository: ConnectionRepository,
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}
  async execute(
    command: RealTimeMessageSenderCommand,
  ): Promise<Result<void, DomainError>> {
    const { chatId, createdAt, message, senderId } = command;

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

    const isVisitor = chat.participants.find(
      (p) => p.id === senderId,
    )?.isVisitor;

    // get receiver
    const receiverParticipants = chat.participants.filter(
      (p) => p.isVisitor !== isVisitor,
    );

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
    const messageResult = await this.emitMessage(
      sender,
      receivers,
      chat,
      message,
      createdAt,
    );
    if (messageResult.isErr()) {
      const errors = messageResult.error;
      return err(new RealTimeMessageSenderError(errors.message));
    }

    // save message to database
    if (messageResult.isOk()) {
      const saveMessageCommand = new SaveMessageCommand(
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

  private async emitMessage(
    sender: ConnectionUser,
    receivers: ConnectionUser[],
    chat: ChatPrimitives,
    message: string,
    createdAt: Date,
  ): Promise<Result<void, DomainErrorWrapper>> {
    const errorWrapperBuilder = new DomainErrorWrapperBuilder();
    if (receivers.length === 0) {
      return err(
        errorWrapperBuilder
          .add(new RealTimeMessageSenderError('No receivers'))
          .build(),
      );
    }
    for (const receiver of receivers) {
      if (receiver.isConnected()) {
        const result = await this.messageEmitter.emit({
          from: sender,
          to: receiver,
          chatId: chat.id,
          message,
          timestamp: createdAt,
        });
        if (result.isErr()) {
          errorWrapperBuilder.add(result.error);
        }
      }
    }

    const errors = errorWrapperBuilder.build();
    if (errors.hasAny()) {
      return err(errors);
    }

    return okVoid();
  }
}
