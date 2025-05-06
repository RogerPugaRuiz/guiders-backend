import { Result } from 'src/context/shared/domain/result';
import { ConnectionUser } from './connection-user';
import { Criteria } from 'src/context/shared/domain/criteria';
import { ConnectionUserNotFound } from './errors/connection-user-not-found';

export const CONNECTION_REPOSITORY = Symbol('CONNECTION_REPOSITORY');

export interface ConnectionRepository {
  save(user: ConnectionUser): Promise<void>;
  remove(user: ConnectionUser): Promise<void>;
  find(criteria: Criteria<ConnectionUser>): Promise<ConnectionUser[]>;
  findOne(
    criteria: Criteria<ConnectionUser>,
  ): Promise<Result<ConnectionUser, ConnectionUserNotFound>>;
}
