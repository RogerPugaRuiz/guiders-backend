import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { SendMessageToVisitorCommand } from './send-message-to-visitor.command';
import { Inject } from '@nestjs/common';
import {
  CONNECTION_REPOSITORY,
  ConnectionRepository,
} from 'src/context/real-time-context/websocket/domain/connection.repository';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';
import { ConnectionUser } from 'src/context/real-time-context/websocket/domain/connection-user';
import {
  IChatMessageEmitter,
  CHAT_MESSAGE_EMITTER,
} from 'src/context/real-time-context/websocket/domain/message-emitter';
import { err, okVoid, Result } from 'src/context/shared/domain/result';
import { SendMessageToVisitorError } from 'src/context/real-time-context/websocket/domain/errors';

export type SendMessageToVisitorResponse = Result<
  void,
  SendMessageToVisitorError
>;

@CommandHandler(SendMessageToVisitorCommand)
export class SendMessageToVisitorCommandHandler
  implements
    ICommandHandler<SendMessageToVisitorCommand, SendMessageToVisitorResponse>
{
  constructor(
    @Inject(CONNECTION_REPOSITORY)
    private readonly connectionRepository: ConnectionRepository,
    @Inject(CHAT_MESSAGE_EMITTER)
    private readonly messageEmitter: IChatMessageEmitter,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(
    command: SendMessageToVisitorCommand,
  ): Promise<SendMessageToVisitorResponse> {
    console.log('Send message to visitor command received', command);
    const { from, to, message, timestamp } = command;

    const resultSender = await this.connectionRepository.findOne(
      new Criteria<ConnectionUser>().addFilter('userId', Operator.EQUALS, from),
    );

    const resultReceiver = await this.connectionRepository.findOne(
      new Criteria<ConnectionUser>().addFilter('userId', Operator.EQUALS, to),
    );

    const error = await this.errorIfUserNotFound(resultSender, resultReceiver);
    if (error.isErr()) {
      return error;
    }
    const receiver = resultReceiver.unwrap();
    const sender = resultSender.unwrap().sendMessage({
      toUser: receiver,
      message,
      timestamp,
    });

    const resultEmitter = await this.messageEmitter.emit({
      from: sender,
      to: receiver,
      message,
      timestamp,
    });
    this.publisher.mergeObjectContext(sender).commit();
    return resultEmitter.mapError((error) => {
      return new SendMessageToVisitorError(error.message);
    });
  }

  private async errorIfUserNotFound(
    resultSender: Result<ConnectionUser, any>,
    resultReceiver: Result<ConnectionUser, any>,
  ): Promise<SendMessageToVisitorResponse> {
    if (resultSender.isErr() && resultReceiver.isErr()) {
      return Promise.resolve(
        err(new SendMessageToVisitorError('Sender and receiver not found')),
      );
    }

    if (resultSender.isErr()) {
      return Promise.resolve(
        err(new SendMessageToVisitorError('Sender not found')),
      );
    }

    if (resultReceiver.isErr()) {
      return Promise.resolve(
        err(new SendMessageToVisitorError('Receiver not found')),
      );
    }

    return Promise.resolve(okVoid());
  }
}
