import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';
import { ConnectionSocketId } from './connection-socket-id';

export class ConnectionRoom extends PrimitiveValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  public static create(value: string): ConnectionRoom {
    return new ConnectionRoom(value);
  }
}
