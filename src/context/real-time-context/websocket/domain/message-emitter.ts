import { Result } from 'src/context/shared/domain/result';
import { ConnectionUser } from './connection-user';
import { UserNotConnectedError } from './errors';

export const CHAT_MESSAGE_EMITTER = Symbol('CHAT_MESSAGE_EMITTER');

export interface IChatMessageEmitter {
  emit(params: {
    from: ConnectionUser;
    to?: ConnectionUser | null | undefined;
    message: string;
    timestamp: Date;
  }): Promise<Result<void, UserNotConnectedError>>;
}
