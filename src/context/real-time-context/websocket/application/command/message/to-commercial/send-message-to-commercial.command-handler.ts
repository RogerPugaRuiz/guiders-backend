import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { SendMessageToCommercialCommand } from './send-message-to-commercial.command';
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
import { SendMessageToCommercialError } from 'src/context/real-time-context/websocket/domain/errors';

export type SendMessageToCommercialResponse = Result<
  void,
  SendMessageToCommercialError
>;

@CommandHandler(SendMessageToCommercialCommand)
export class SendMessageToCommercialCommandHandler
  implements
    ICommandHandler<
      SendMessageToCommercialCommand,
      SendMessageToCommercialResponse
    >
{
  constructor(
    @Inject(CONNECTION_REPOSITORY)
    private readonly connectionRepository: ConnectionRepository,
    @Inject(CHAT_MESSAGE_EMITTER)
    private readonly messageEmitter: IChatMessageEmitter,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(
    command: SendMessageToCommercialCommand,
  ): Promise<SendMessageToCommercialResponse> {
    console.log('Send message to visitor command received', command);
    const { from, to, message, timestamp } = command;

    const resultSender = await this.connectionRepository.findOne(
      new Criteria<ConnectionUser>().addFilter('userId', Operator.EQUALS, from),
    );

    const resultReceiver = await this.connectionRepository.findOne(
      new Criteria<ConnectionUser>().addFilter('userId', Operator.EQUALS, to),
    );

    if (resultSender.isErr()) {
      return err(new SendMessageToCommercialError('Sender not found'));
    }

    if (resultReceiver.isErr()) {
      const sender = resultSender.unwrap().sendMessage({
        message,
        timestamp,
      });

      const resultEmitter = await this.messageEmitter.emit({
        from: sender,
        message,
        timestamp,
      });
      this.publisher.mergeObjectContext(sender).commit();
      return resultEmitter.mapError((error) => {
        return new SendMessageToCommercialError(error.message);
      });
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
      return new SendMessageToCommercialError(error.message);
    });
  }
}
