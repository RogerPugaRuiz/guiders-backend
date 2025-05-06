import { Criteria, Operator } from 'src/context/shared/domain/criteria';
import { ConnectionUserPrimitive } from './connection-user';

export class SocketIdEqualsEspefication {
  public static execute(socketId: string): Criteria<ConnectionUserPrimitive> {
    const criteria = new Criteria<ConnectionUserPrimitive>().addFilter(
      'socketId',
      Operator.EQUALS,
      socketId,
    );
    return criteria;
  }
}
