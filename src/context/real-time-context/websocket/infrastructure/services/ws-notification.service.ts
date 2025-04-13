import { Inject, Injectable } from '@nestjs/common';
import { INotification } from '../../domain/notification';
import {
  CONNECTION_REPOSITORY,
  ConnectionRepository,
} from '../../domain/connection.repository';
import { RealTimeWebSocketGateway } from '../websocket.gateway';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';
import { ConnectionUser } from '../../domain/connection-user';

@Injectable()
export class WsNotificationService implements INotification {
  constructor(
    @Inject(CONNECTION_REPOSITORY)
    private readonly connectionRepository: ConnectionRepository,
    private readonly ws: RealTimeWebSocketGateway,
  ) {}
  async notify(
    payload: Record<string, unknown>,
    options: {
      recipientId: string;
      type?: string;
    },
  ): Promise<void> {
    const { recipientId, type } = options;
    const criteria = new Criteria<ConnectionUser>().addFilter(
      'userId',
      Operator.EQUALS,
      recipientId,
    );
    const resultConnection = await this.connectionRepository.findOne(criteria);
    if (resultConnection.isErr()) {
      return;
    }
    const connection = resultConnection.unwrap();
    if (connection.isDisconnected()) {
      return;
    }

    this.ws.sendNotification(payload, connection.socketId.get().value, type);
  }
}
