import { Inject, Injectable, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(WsNotificationService.name);
  async notify(params: {
    payload: Record<string, unknown>;
    recipientId: string;
    type: string;
  }): Promise<void> {
    const { recipientId, type, payload } = params;
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

    this.logger.log(
      `notify: Sending notification to ${recipientId} with type ${type}`,
    );
    this.ws.sendNotification(payload, connection.socketId.get().value, type);
  }
  notifyRole(params: {
    payload: Record<string, unknown>;
    role: string;
    type?: string;
  }): Promise<void> {
    const { role, type, payload } = params;
    console.log('notifyRole', role, type, payload);
    this.ws.sendNotification(payload, role, type);
    return Promise.resolve();
  }
}
